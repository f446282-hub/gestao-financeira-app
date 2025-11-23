from datetime import date

from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from backend.database import Base


class Revenue(Base):
    __tablename__ = "revenues"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)
    account = Column(String, nullable=True)
    due_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    amount_total = Column(Float, nullable=False)
    installments = Column(Integer, nullable=False, default=1)
    installment_n = Column(Integer, nullable=False, default=1)
    amount_installment = Column(Float, nullable=False)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)
    account = Column(String, nullable=True)
    due_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    amount_total = Column(Float, nullable=False)
    installments = Column(Integer, nullable=False, default=1)
    installment_n = Column(Integer, nullable=False, default=1)
    amount_installment = Column(Float, nullable=False)


class CreditCard(Base):
    __tablename__ = "credit_cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    closing_day = Column(Integer, nullable=False)
    due_day = Column(Integer, nullable=False)
    limit_total = Column(Float, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    transactions = relationship(
        "CreditCardTransaction", back_populates="card", cascade="all, delete-orphan"
    )


class CreditCardTransaction(Base):
    __tablename__ = "credit_card_transactions"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("credit_cards.id"), nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)
    purchase_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    amount_total = Column(Float, nullable=False)
    installments = Column(Integer, nullable=False, default=1)
    installment_n = Column(Integer, nullable=False, default=1)
    amount_installment = Column(Float, nullable=False)

    card = relationship("CreditCard", back_populates="transactions")
