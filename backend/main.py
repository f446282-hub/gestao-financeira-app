from __future__ import annotations

from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend import models, schemas, crud, database
from backend.database import get_db


# IMPORTS INTERNOS – use relativo (.)
from . import crud, schemas, models
from .database import Base, engine, get_db


# Cria as tabelas no start (ok para app pequeno / dev)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestão Financeira API")


# CORS - em desenvolvimento vamos liberar geral
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


# ---------- RECEITAS ----------


@app.get("/api/receitas", response_model=List[schemas.RevenueOut])
def listar_receitas(db: Session = Depends(get_db)):
    return crud.list_revenues(db)


@app.post("/api/receitas", response_model=List[schemas.RevenueOut])
def criar_receita(revenue: schemas.RevenueCreate, db: Session = Depends(get_db)):
    return crud.create_revenue_with_installments(db, revenue)


@app.put("/api/receitas/{revenue_id}", response_model=schemas.RevenueOut)
def atualizar_receita(
    revenue_id: int, revenue: schemas.RevenueBase, db: Session = Depends(get_db)
):
    obj = crud.update_revenue(db, revenue_id, revenue)
    if not obj:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return obj


@app.delete("/api/receitas/{revenue_id}")
def excluir_receita(revenue_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_revenue(db, revenue_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return {"success": True}


# ---------- DESPESAS ----------


@app.get("/api/despesas", response_model=List[schemas.ExpenseOut])
def listar_despesas(db: Session = Depends(get_db)):
    return crud.list_expenses(db)


@app.post("/api/despesas", response_model=List[schemas.ExpenseOut])
def criar_despesa(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_expense_with_installments(db, expense)


@app.put("/api/despesas/{expense_id}", response_model=schemas.ExpenseOut)
def atualizar_despesa(
    expense_id: int, expense: schemas.ExpenseBase, db: Session = Depends(get_db)
):
    obj = crud.update_expense(db, expense_id, expense)
    if not obj:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return obj


@app.delete("/api/despesas/{expense_id}")
def excluir_despesa(expense_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_expense(db, expense_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return {"success": True}


# ---------- CARTÕES ----------


@app.get("/api/cartoes", response_model=List[schemas.CreditCardOut])
def listar_cartoes(db: Session = Depends(get_db)):
    return crud.list_credit_cards(db)


@app.post("/api/cartoes", response_model=schemas.CreditCardOut)
def criar_cartao(card: schemas.CreditCardCreate, db: Session = Depends(get_db)):
    return crud.create_credit_card(db, card)


@app.put("/api/cartoes/{card_id}", response_model=schemas.CreditCardOut)
def atualizar_cartao(
    card_id: int, card: schemas.CreditCardCreate, db: Session = Depends(get_db)
):
    obj = crud.update_credit_card(db, card_id, card)
    if not obj:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return obj


@app.delete("/api/cartoes/{card_id}")
def excluir_cartao(card_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_credit_card(db, card_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return {"success": True}


# ---------- TRANSAÇÕES DE CARTÃO ----------


@app.get(
    "/api/transacoes-cartao",
    response_model=List[schemas.CreditCardTransactionOut],
)
def listar_transacoes_cartao(
    card_id: Optional[int] = None, db: Session = Depends(get_db)
):
    return crud.list_credit_card_transactions(db, card_id=card_id)


@app.post(
    "/api/transacoes-cartao",
    response_model=List[schemas.CreditCardTransactionOut],
)
def criar_transacao_cartao(
    tx: schemas.CreditCardTransactionCreate, db: Session = Depends(get_db)
):
    return crud.create_credit_card_transactions_with_installments(db, tx)


@app.put(
    "/api/transacoes-cartao/{tx_id}",
    response_model=schemas.CreditCardTransactionOut,
)
def atualizar_transacao_cartao(
    tx_id: int,
    tx: schemas.CreditCardTransactionBase,
    db: Session = Depends(get_db),
):
    obj = crud.update_credit_card_transaction(db, tx_id, tx)
    if not obj:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return obj


@app.delete("/api/transacoes-cartao/{tx_id}")
def excluir_transacao_cartao(tx_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_credit_card_transaction(db, tx_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"success": True}
