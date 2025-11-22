from calendar import monthrange
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

import models
import schemas



# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def add_months(base_date: date, months: int) -> date:
    """Adiciona meses a uma data, respeitando o fim do mês."""
    month = base_date.month - 1 + months
    year = base_date.year + month // 12
    month = month % 12 + 1
    day = min(base_date.day, monthrange(year, month)[1])
    return date(year, month, day)


# ---------------------------------------------------------------------------
# RECEITAS
# ---------------------------------------------------------------------------

def create_revenue_with_installments(
    db: Session, revenue_in: schemas.RevenueCreate
) -> models.Revenue:
    """
    Cria uma receita e, se tiver parcelas, gera os lançamentos mensais.
    """
    # Receita "mãe"
    revenue = models.Revenue(
        description=revenue_in.description,
        category=revenue_in.category,
        amount=revenue_in.amount,
        due_date=revenue_in.due_date,
        account=revenue_in.account,
        payment_method=revenue_in.payment_method,
        total_installments=revenue_in.total_installments,
    )
    db.add(revenue)
    db.commit()
    db.refresh(revenue)

    # Parcelas (se informado)
    if revenue_in.total_installments and revenue_in.total_installments > 1:
        amount_per_installment = revenue_in.amount / revenue_in.total_installments
        for installment_number in range(1, revenue_in.total_installments + 1):
            installment_due_date = add_months(revenue_in.due_date, installment_number - 1)
            installment = models.RevenueInstallment(
                revenue_id=revenue.id,
                installment_number=installment_number,
                amount=amount_per_installment,
                due_date=installment_due_date,
                paid=False,
            )
            db.add(installment)
        db.commit()

    return revenue


def get_all_revenues(db: Session):
    return db.query(models.Revenue).all()


def update_revenue(
    db: Session, revenue_id: int, revenue_in: schemas.RevenueCreate
) -> Optional[models.Revenue]:
    revenue = db.query(models.Revenue).filter(models.Revenue.id == revenue_id).first()
    if not revenue:
        return None

    for field, value in revenue_in.model_dump().items():
        setattr(revenue, field, value)

    db.commit()
    db.refresh(revenue)
    return revenue


def delete_revenue(db: Session, revenue_id: int) -> bool:
    revenue = db.query(models.Revenue).filter(models.Revenue.id == revenue_id).first()
    if not revenue:
        return False
    db.delete(revenue)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# DESPESAS
# ---------------------------------------------------------------------------

def create_expense_with_installments(
    db: Session, expense_in: schemas.ExpenseCreate
) -> models.Expense:
    """
    Cria uma despesa e, se tiver parcelas, gera os lançamentos mensais.
    """
    expense = models.Expense(
        description=expense_in.description,
        category=expense_in.category,
        amount=expense_in.amount,
        due_date=expense_in.due_date,
        account=expense_in.account,
        payment_method=expense_in.payment_method,
        total_installments=expense_in.total_installments,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    if expense_in.total_installments and expense_in.total_installments > 1:
        amount_per_installment = expense_in.amount / expense_in.total_installments
        for installment_number in range(1, expense_in.total_installments + 1):
            installment_due_date = add_months(expense_in.due_date, installment_number - 1)
            installment = models.ExpenseInstallment(
                expense_id=expense.id,
                installment_number=installment_number,
                amount=amount_per_installment,
                due_date=installment_due_date,
                paid=False,
            )
            db.add(installment)
        db.commit()

    return expense


def get_all_expenses(db: Session):
    return db.query(models.Expense).all()


def update_expense(
    db: Session, expense_id: int, expense_in: schemas.ExpenseCreate
) -> Optional[models.Expense]:
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        return None

    for field, value in expense_in.model_dump().items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense_id: int) -> bool:
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        return False
    db.delete(expense)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# CARTÕES DE CRÉDITO
# ---------------------------------------------------------------------------

def create_credit_card(
    db: Session, card_in: schemas.CreditCardCreate
) -> models.CreditCard:
    card = models.CreditCard(
        name=card_in.name,
        closing_day=card_in.closing_day,
        due_day=card_in.due_day,
        limit_amount=card_in.limit_amount,
        is_active=card_in.is_active,
        logo_url=card_in.logo_url,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def get_all_credit_cards(db: Session):
    return db.query(models.CreditCard).all()


def update_credit_card(
    db: Session, card_id: int, card_in: schemas.CreditCardCreate
) -> Optional[models.CreditCard]:
    card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id).first()
    if not card:
        return None

    for field, value in card_in.model_dump().items():
        setattr(card, field, value)

    db.commit()
    db.refresh(card)
    return card


def delete_credit_card(db: Session, card_id: int) -> bool:
    card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id).first()
    if not card:
        return False
    db.delete(card)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# TRANSAÇÕES DE CARTÃO
# ---------------------------------------------------------------------------

def create_credit_card_transaction_with_installments(
    db: Session, tx_in: schemas.CreditCardTransactionCreate
) -> models.CreditCardTransaction:
    """
    Cria uma transação de cartão e gera as parcelas.
    """
    tx = models.CreditCardTransaction(
        card_id=tx_in.card_id,
        description=tx_in.description,
        purchase_date=tx_in.purchase_date,
        amount=tx_in.amount,
        total_installments=tx_in.total_installments,
        category=tx_in.category,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    if tx_in.total_installments and tx_in.total_installments > 1:
        amount_per_installment = tx_in.amount / tx_in.total_installments
        for installment_number in range(1, tx_in.total_installments + 1):
            installment_due_date = add_months(
                tx_in.first_due_date, installment_number - 1
            )
            installment = models.CreditCardInstallment(
                transaction_id=tx.id,
                installment_number=installment_number,
                amount=amount_per_installment,
                due_date=installment_due_date,
                paid=False,
            )
            db.add(installment)
        db.commit()

    return tx


def get_all_credit_card_transactions(db: Session):
    return db.query(models.CreditCardTransaction).all()


def update_credit_card_transaction(
    db: Session,
    tx_id: int,
    tx_in: schemas.CreditCardTransactionCreate,
) -> Optional[models.CreditCardTransaction]:
    tx = (
        db.query(models.CreditCardTransaction)
        .filter(models.CreditCardTransaction.id == tx_id)
        .first()
    )
    if not tx:
        return None

    for field, value in tx_in.model_dump().items():
        setattr(tx, field, value)

    db.commit()
    db.refresh(tx)
    return tx


def delete_credit_card_transaction(db: Session, tx_id: int) -> bool:
    tx = (
        db.query(models.CreditCardTransaction)
        .filter(models.CreditCardTransaction.id == tx_id)
        .first()
    )
    if not tx:
        return False
    db.delete(tx)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# DASHBOARD (exemplo simples)
# ---------------------------------------------------------------------------

def get_dashboard_summary(db: Session) -> dict:
    total_revenues = db.query(models.Revenue).count()
    total_expenses = db.query(models.Expense).count()
    total_cards = db.query(models.CreditCard).count()

    return {
        "total_revenues": total_revenues,
        "total_expenses": total_expenses,
        "total_cards": total_cards,
    }
