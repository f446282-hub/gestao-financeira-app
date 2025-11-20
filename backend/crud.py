from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from calendar import monthrange

from . import models, schemas


def add_months(d: date, months: int) -> date:
    """Adiciona meses a uma data, ajustando fim de mês."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


# ---------- RECEITAS ----------

def get_revenues(db: Session):
    return db.query(models.Revenue).order_by(models.Revenue.due_date.desc()).all()


def create_revenue_with_installments(db: Session, revenue: schemas.RevenueCreate):
    parcelas = revenue.installments if revenue.installments and revenue.installments > 0 else 1
    valor_total = revenue.amount_total or 0.0
    valor_parcela = valor_total / parcelas if parcelas > 0 else valor_total

    created = []

    for n in range(1, parcelas + 1):
        due_n = add_months(revenue.due_date, n - 1)
        pay_date = revenue.payment_date if parcelas == 1 else None

        obj = models.Revenue(
            description=revenue.description,
            category=revenue.category,
            account=revenue.account,
            due_date=due_n,
            payment_date=pay_date,
            amount_total=valor_parcela,
            installments=parcelas,
            installment_n=n,
            payment_method=revenue.payment_method,
            notes=revenue.notes,
        )
        db.add(obj)
        created.append(obj)

    db.commit()
    for c in created:
        db.refresh(c)

    # devolve a primeira parcela (API espera um objeto só)
    return created[0]


def update_revenue_payment_date(
    db: Session, revenue_id: int, payment_date: Optional[date]
):
    obj = db.query(models.Revenue).filter(models.Revenue.id == revenue_id).first()
    if not obj:
        return None
    obj.payment_date = payment_date
    db.commit()
    db.refresh(obj)
    return obj
from sqlalchemy.orm import Session
from . import models, schemas
# (esses imports provavelmente já existem no topo do arquivo)

def update_receita(db: Session, receita_id: int, receita_in: schemas.RevenueCreate):
    receita = db.query(models.Receita).filter(models.Receita.id == receita_id).first()
    if not receita:
        return None
    for field, value in receita_in.dict().items():
        setattr(receita, field, value)
    db.commit()
    db.refresh(receita)
    return receita


def delete_receita(db: Session, receita_id: int) -> bool:
    receita = db.query(models.Receita).filter(models.Receita.id == receita_id).first()
    if not receita:
        return False
    db.delete(receita)
    db.commit()
    return True


def update_despesa(db: Session, despesa_id: int, despesa_in: schemas.ExpenseCreate):
    despesa = db.query(models.Despesa).filter(models.Despesa.id == despesa_id).first()
    if not despesa:
        return None
    for field, value in despesa_in.dict().items():
        setattr(despesa, field, value)
    db.commit()
    db.refresh(despesa)
    return despesa


def delete_despesa(db: Session, despesa_id: int) -> bool:
    despesa = db.query(models.Despesa).filter(models.Despesa.id == despesa_id).first()
    if not despesa:
        return False
    db.delete(despesa)
    db.commit()
    return True



# ---------- DESPESAS ----------

def get_expenses(db: Session):
    return db.query(models.Expense).order_by(models.Expense.due_date.desc()).all()


def create_expense_with_installments(db: Session, expense: schemas.ExpenseCreate):
    parcelas = expense.installments if expense.installments and expense.installments > 0 else 1
    valor_total = expense.amount_total or 0.0
    valor_parcela = valor_total / parcelas if parcelas > 0 else valor_total

    created = []

    for n in range(1, parcelas + 1):
        due_n = add_months(expense.due_date, n - 1)
        pay_date = expense.payment_date if parcelas == 1 else None

        obj = models.Expense(
            description=expense.description,
            category=expense.category,
            account=expense.account,
            due_date=due_n,
            payment_date=pay_date,
            amount_total=valor_parcela,
            installments=parcelas,
            installment_n=n,
            payment_method=expense.payment_method,
            notes=expense.notes,
        )
        db.add(obj)
        created.append(obj)

    db.commit()
    for c in created:
        db.refresh(c)

    return created[0]


def update_expense_payment_date(
    db: Session, expense_id: int, payment_date: Optional[date]
):
    obj = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not obj:
        return None
    obj.payment_date = payment_date
    db.commit()
    db.refresh(obj)
    return obj
def update_despesa(db: Session, despesa_id: int, despesa_in: schemas.ExpenseCreate) -> models.Despesa | None:
    despesa = db.query(models.Despesa).filter(models.Despesa.id == despesa_id).first()
    if not despesa:
        return None
    for field, value in despesa_in.dict().items():
        setattr(despesa, field, value)
    db.commit()
    db.refresh(despesa)
    return despesa


def delete_despesa(db: Session, despesa_id: int) -> bool:
    despesa = db.query(models.Despesa).filter(models.Despesa.id == despesa_id).first()
    if not despesa:
        return False
    db.delete(despesa)
    db.commit()
    return True


# ---------- CARTÕES DE CRÉDITO ----------

def get_credit_cards(db: Session):
    return db.query(models.CreditCard).order_by(models.CreditCard.name.asc()).all()


def create_credit_card(db: Session, card: schemas.CreditCardCreate):
    db_obj = models.CreditCard(**card.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_credit_card_transactions(db: Session, card_id: Optional[int] = None):
    query = db.query(models.CreditCardTransaction)
    if card_id is not None:
        query = query.filter(
            models.CreditCardTransaction.credit_card_id == card_id
        )
    return query.order_by(models.CreditCardTransaction.purchase_date.desc()).all()


def create_credit_card_transaction(
    db: Session, trx: schemas.CreditCardTransactionCreate
):
    """
    Cria UMA TRANSAÇÃO POR PARCELA no cartão.

    Ex:
      total = 1000, installments = 4
      -> 4 linhas em credit_card_transactions
         (1/4, 2/4, 3/4, 4/4), cada uma com amount_installment.
    """
    parcelas = trx.installments if trx.installments and trx.installments > 0 else 1
    total = trx.amount_total or 0.0

    # se o front já mandou amount_installment usamos ele,
    # senão calculamos aqui
    valor_parcela = trx.amount_installment or (total / parcelas if parcelas > 0 else total)

    created = []

    for n in range(1, parcelas + 1):
        due_n = add_months(trx.due_date, n - 1)

        obj = models.CreditCardTransaction(
            credit_card_id=trx.credit_card_id,
            description=trx.description,
            category=trx.category,
            purchase_date=trx.purchase_date,
            due_date=due_n,
            amount_total=total,
            installments=parcelas,
            installment_n=n,
            amount_installment=valor_parcela,
        )
        db.add(obj)
        created.append(obj)

    db.commit()
    for c in created:
        db.refresh(c)

    # devolvemos só a primeira parcela na resposta da API,
    # mas TODAS as parcelas já estão gravadas no banco
    return created[0]



def create_expenses_from_card_transaction(
    db: Session, trx_obj: models.CreditCardTransaction
):
    """Cria despesas automaticamente para cada parcela de uma compra no cartão."""
    despesas = []
    parcelas = trx_obj.installments if trx_obj.installments and trx_obj.installments > 0 else 1

    for parcela in range(1, parcelas + 1):
        due_n = add_months(trx_obj.due_date, parcela - 1)
        expense = models.Expense(
            description=f"Cartão: {trx_obj.description}",
            category=trx_obj.category,
            account=f"Cartão {trx_obj.credit_card_id}",
            due_date=due_n,
            payment_date=None,
            amount_total=float(trx_obj.amount_installment),
            installments=parcelas,
            installment_n=parcela,
            payment_method="Cartão de crédito",
            notes="Gerado automaticamente a partir de compra no cartão",
        )
        db.add(expense)
        despesas.append(expense)

    db.commit()
    for d in despesas:
        db.refresh(d)

    return despesas
def delete_transacao_cartao(db: Session, transacao_id: int) -> bool:
    tx = db.query(models.CreditCardTransaction).filter(
        models.CreditCardTransaction.id == transacao_id
    ).first()
    if not tx:
        return False
    db.delete(tx)
    db.commit()
    return True


# ---------- PARÂMETROS DE RECEITA ----------

def get_revenue_categories(db: Session):
    return db.query(models.RevenueCategory).order_by(models.RevenueCategory.name).all()


def create_revenue_category(db: Session, item: schemas.RevenueCategoryCreate):
    obj = models.RevenueCategory(**item.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_revenue_accounts(db: Session):
    return db.query(models.RevenueAccount).order_by(models.RevenueAccount.name).all()


def create_revenue_account(db: Session, item: schemas.RevenueAccountCreate):
    obj = models.RevenueAccount(**item.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_revenue_payment_methods(db: Session):
    return (
        db.query(models.RevenuePaymentMethod)
        .order_by(models.RevenuePaymentMethod.name)
        .all()
    )


def create_revenue_payment_method(
    db: Session, item: schemas.RevenuePaymentMethodCreate
):
    obj = models.RevenuePaymentMethod(**item.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ---------- PARÂMETROS DE DESPESA ----------

def get_expense_categories(db: Session):
    return db.query(models.ExpenseCategory).order_by(models.ExpenseCategory.name).all()


def create_expense_category(db: Session, item: schemas.ExpenseCategoryCreate):
    obj = models.ExpenseCategory(**item.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_expense_accounts(db: Session):
    return db.query(models.ExpenseAccount).order_by(models.ExpenseAccount.name).all()


def create_expense_account(db: Session, item: schemas.ExpenseAccountCreate):
    obj = models.ExpenseAccount(**item.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_expense_payment_methods(db: Session):
    return (
        db.query(models.ExpensePaymentMethod)
        .order_by(models.ExpensePaymentMethod.name)
        .all()
    )


def create_expense_payment_method(
    db: Session, item: schemas.ExpensePaymentMethodCreate
):
    obj = models.ExpensePaymentMethod(**item.dict())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
