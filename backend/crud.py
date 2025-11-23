from __future__ import annotations

import calendar
from datetime import date
from typing import List, Optional

from sqlalchemy.orm import Session

# IMPORTS INTERNOS – relativo
from . import models, schemas



# ---------- helpers ----------


def _add_months(original: date, months: int) -> date:
    """Soma `months` meses a uma data, mantendo o dia quando possível."""
    month = original.month - 1 + months
    year = original.year + month // 12
    month = month % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(original.day, last_day)
    return date(year, month, day)


# ---------- RECEITAS ----------


def list_revenues(db: Session) -> List[models.Revenue]:
    return db.query(models.Revenue).order_by(models.Revenue.due_date).all()


def create_revenue_with_installments(
    db: Session, data: schemas.RevenueCreate
) -> List[models.Revenue]:
    installments = max(1, data.installments)
    amount_per_installment = data.amount_total / installments

    created: List[models.Revenue] = []
    for i in range(installments):
        due = _add_months(data.due_date, i)
        revenue = models.Revenue(
            description=data.description,
            category=data.category,
            account=data.account,
            due_date=due,
            payment_date=data.payment_date,
            amount_total=data.amount_total,
            installments=installments,
            installment_n=i + 1,
            amount_installment=amount_per_installment,
        )
        db.add(revenue)
        created.append(revenue)

    db.commit()
    for r in created:
        db.refresh(r)
    return created


def update_revenue(
    db: Session, revenue_id: int, data: schemas.RevenueBase
) -> Optional[models.Revenue]:
    revenue = db.query(models.Revenue).get(revenue_id)
    if not revenue:
        return None

    for field in (
        "description",
        "category",
        "account",
        "due_date",
        "payment_date",
        "amount_total",
        "installments",
        "installment_n",
        "amount_installment",
    ):
        setattr(revenue, field, getattr(data, field))

    db.commit()
    db.refresh(revenue)
    return revenue


def delete_revenue(db: Session, revenue_id: int) -> bool:
    revenue = db.query(models.Revenue).get(revenue_id)
    if not revenue:
        return False
    db.delete(revenue)
    db.commit()
    return True


# ---------- DESPESAS ----------


def list_expenses(db: Session) -> List[models.Expense]:
    return db.query(models.Expense).order_by(models.Expense.due_date).all()


def create_expense_with_installments(
    db: Session, data: schemas.ExpenseCreate
) -> List[models.Expense]:
    installments = max(1, data.installments)
    amount_per_installment = data.amount_total / installments

    created: List[models.Expense] = []
    for i in range(installments):
        due = _add_months(data.due_date, i)
        expense = models.Expense(
            description=data.description,
            category=data.category,
            account=data.account,
            due_date=due,
            payment_date=data.payment_date,
            amount_total=data.amount_total,
            installments=installments,
            installment_n=i + 1,
            amount_installment=amount_per_installment,
        )
        db.add(expense)
        created.append(expense)

    db.commit()
    for e in created:
        db.refresh(e)
    return created


def update_expense(
    db: Session, expense_id: int, data: schemas.ExpenseBase
) -> Optional[models.Expense]:
    expense = db.query(models.Expense).get(expense_id)
    if not expense:
        return None

    for field in (
        "description",
        "category",
        "account",
        "due_date",
        "payment_date",
        "amount_total",
        "installments",
        "installment_n",
        "amount_installment",
    ):
        setattr(expense, field, getattr(data, field))

    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense_id: int) -> bool:
    expense = db.query(models.Expense).get(expense_id)
    if not expense:
        return False
    db.delete(expense)
    db.commit()
    return True


# ---------- CARTÕES ----------


def list_credit_cards(db: Session) -> List[models.CreditCard]:
    return db.query(models.CreditCard).order_by(models.CreditCard.name).all()


def create_credit_card(
    db: Session, data: schemas.CreditCardCreate
) -> models.CreditCard:
    card = models.CreditCard(
        name=data.name,
        closing_day=data.closing_day,
        due_day=data.due_day,
        limit_total=data.limit_total,
        is_active=data.is_active,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def update_credit_card(
    db: Session, card_id: int, data: schemas.CreditCardCreate
) -> Optional[models.CreditCard]:
    card = db.query(models.CreditCard).get(card_id)
    if not card:
        return None

    card.name = data.name
    card.closing_day = data.closing_day
    card.due_day = data.due_day
    card.limit_total = data.limit_total
    card.is_active = data.is_active

    db.commit()
    db.refresh(card)
    return card


def delete_credit_card(db: Session, card_id: int) -> bool:
    card = db.query(models.CreditCard).get(card_id)
    if not card:
        return False
    db.delete(card)
    db.commit()
    return True


# ---------- TRANSAÇÕES DE CARTÃO ----------


def list_credit_card_transactions(
    db: Session, card_id: Optional[int] = None
) -> List[models.CreditCardTransaction]:
    query = db.query(models.CreditCardTransaction)
    if card_id is not None:
        query = query.filter(models.CreditCardTransaction.card_id == card_id)
    return query.order_by(models.CreditCardTransaction.due_date).all()


def create_credit_card_transactions_with_installments(
    db: Session, data: schemas.CreditCardTransactionCreate
) -> List[models.CreditCardTransaction]:
    installments = max(1, data.installments)
    amount_per_installment = data.amount_total / installments

    created: List[models.CreditCardTransaction] = []
    for i in range(installments):
        due = _add_months(data.due_date, i)
        tx = models.CreditCardTransaction(
            card_id=data.card_id,
            description=data.description,
            category=data.category,
            purchase_date=data.purchase_date,
            due_date=due,
            amount_total=data.amount_total,
            installments=installments,
            installment_n=i + 1,
            amount_installment=amount_per_installment,
        )
        db.add(tx)
        created.append(tx)

    db.commit()
    for t in created:
        db.refresh(t)
    return created


def update_credit_card_transaction(
    db: Session, tx_id: int, data: schemas.CreditCardTransactionBase
) -> Optional[models.CreditCardTransaction]:
    tx = db.query(models.CreditCardTransaction).get(tx_id)
    if not tx:
        return None

    for field in (
        "card_id",
        "description",
        "category",
        "purchase_date",
        "due_date",
        "amount_total",
        "installments",
        "installment_n",
        "amount_installment",
    ):
        setattr(tx, field, getattr(data, field))

    db.commit()
    db.refresh(tx)
    return tx


def delete_credit_card_transaction(db: Session, tx_id: int) -> bool:
    tx = db.query(models.CreditCardTransaction).get(tx_id)
    if not tx:
        return False
    db.delete(tx)
    db.commit()
    return True
