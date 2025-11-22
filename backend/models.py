from sqlalchemy import Column, Integer, String, Date, Numeric, Text
from backend.database import Base



class Revenue(Base):
    __tablename__ = "revenues"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), nullable=False)
    category = Column(String(100))
    account = Column(String(80))
    due_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    amount_total = Column(Numeric(14, 2), nullable=False)
    installments = Column(Integer, default=1)
    installment_n = Column(Integer, default=1)
    payment_method = Column(String(50))
    notes = Column(Text)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), nullable=False)
    category = Column(String(100))
    account = Column(String(80))
    due_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    amount_total = Column(Numeric(14, 2), nullable=False)
    installments = Column(Integer, default=1)
    installment_n = Column(Integer, default=1)
    payment_method = Column(String(50))
    notes = Column(Text)


class CreditCard(Base):
    __tablename__ = "credit_cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    closing_day = Column(Integer, nullable=False)
    due_day = Column(Integer, nullable=False)
    limit_total = Column(Numeric(14, 2))
    annual_fee = Column(Numeric(14, 2))
    status = Column(String(20), default="ativo")


class CreditCardTransaction(Base):
    __tablename__ = "credit_card_transactions"

    id = Column(Integer, primary_key=True, index=True)
    credit_card_id = Column(Integer, nullable=False)
    description = Column(String(255), nullable=False)
    category = Column(String(100))
    purchase_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    amount_total = Column(Numeric(14, 2), nullable=False)
    installments = Column(Integer, default=1)
    installment_n = Column(Integer, default=1)
    amount_installment = Column(Numeric(14, 2), nullable=False)


# ---------- PARÂMETROS DE RECEITA ----------

class RevenueCategory(Base):
    __tablename__ = "revenue_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)


class RevenueAccount(Base):
    __tablename__ = "revenue_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)


class RevenuePaymentMethod(Base):
    __tablename__ = "revenue_payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)


# ---------- PARÂMETROS DE DESPESA ----------

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)


class ExpenseAccount(Base):
    __tablename__ = "expense_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)


class ExpensePaymentMethod(Base):
    __tablename__ = "expense_payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
