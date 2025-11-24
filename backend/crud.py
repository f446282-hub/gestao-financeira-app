# backend/crud.py
from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas


# ---------- REVENUES ----------

def create_revenue(db: Session, data: schemas.RevenueCreate) -> models.Revenue:
    revenue = models.Revenue(**data.dict())
    db.add(revenue)
    db.commit()
    db.refresh(revenue)
    return revenue


def get_revenues(db: Session) -> List[models.Revenue]:
    return db.query(models.Revenue).order_by(models.Revenue.due_date).all()


def get_revenue(db: Session, revenue_id: int) -> Optional[models.Revenue]:
    return db.query(models.Revenue).filter(models.Revenue.id == revenue_id).first()


def update_revenue(db: Session, revenue_id: int, data: schemas.RevenueUpdate) -> Optional[models.Revenue]:
    revenue = get_revenue(db, revenue_id)
    if not revenue:
        return None
    for field, value in data.dict().items():
        setattr(revenue, field, value)
    db.commit()
    db.refresh(revenue)
    return revenue


def delete_revenue(db: Session, revenue_id: int) -> bool:
    revenue = get_revenue(db, revenue_id)
    if not revenue:
        return False
    db.delete(revenue)
    db.commit()
    return True


# ---------- EXPENSES ----------

def create_expense(db: Session, data: schemas.ExpenseCreate) -> models.Expense:
    expense = models.Expense(**data.dict())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def get_expenses(db: Session) -> List[models.Expense]:
    return db.query(models.Expense).order_by(models.Expense.due_date).all()


def get_expense(db: Session, expense_id: int) -> Optional[models.Expense]:
    return db.query(models.Expense).filter(models.Expense.id == expense_id).first()


def update_expense(db: Session, expense_id: int, data: schemas.ExpenseUpdate) -> Optional[models.Expense]:
    expense = get_expense(db, expense_id)
    if not expense:
        return None
    for field, value in data.dict().items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense_id: int) -> bool:
    expense = get_expense(db, expense_id)
    if not expense:
        return False
    db.delete(expense)
    db.commit()
    return True


# ---------- CREDIT CARDS ----------

def create_credit_card(db: Session, data: schemas.CreditCardCreate) -> models.CreditCard:
    card = models.CreditCard(**data.dict())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def get_credit_cards(db: Session) -> List[models.CreditCard]:
    return db.query(models.CreditCard).order_by(models.CreditCard.name).all()


def get_credit_card(db: Session, card_id: int) -> Optional[models.CreditCard]:
    return db.query(models.CreditCard).filter(models.CreditCard.id == card_id).first()


def update_credit_card(db: Session, card_id: int, data: schemas.CreditCardUpdate) -> Optional[models.CreditCard]:
    card = get_credit_card(db, card_id)
    if not card:
        return None
    for field, value in data.dict().items():
        setattr(card, field, value)
    db.commit()
    db.refresh(card)
    return card


def delete_credit_card(db: Session, card_id: int) -> bool:
    card = get_credit_card(db, card_id)
    if not card:
        return False
    db.delete(card)
    db.commit()
    return True


# ---------- CREDIT CARD TRANSACTIONS ----------

def create_credit_card_transaction(
    db: Session, data: schemas.CreditCardTransactionCreate
) -> models.CreditCardTransaction:
    tx = models.CreditCardTransaction(**data.dict())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def get_credit_card_transactions(db: Session) -> List[models.CreditCardTransaction]:
    return (
        db.query(models.CreditCardTransaction)
        .order_by(models.CreditCardTransaction.due_date)
        .all()
    )


def get_credit_card_transaction(
    db: Session, tx_id: int
) -> Optional[models.CreditCardTransaction]:
    return (
        db.query(models.CreditCardTransaction)
        .filter(models.CreditCardTransaction.id == tx_id)
        .first()
    )


def update_credit_card_transaction(
    db: Session, tx_id: int, data: schemas.CreditCardTransactionUpdate
) -> Optional[models.CreditCardTransaction]:
    tx = get_credit_card_transaction(db, tx_id)
    if not tx:
        return None
    for field, value in data.dict().items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


def delete_credit_card_transaction(db: Session, tx_id: int) -> bool:
    tx = get_credit_card_transaction(db, tx_id)
    if not tx:
        return False
    db.delete(tx)
    db.commit()
    return True
