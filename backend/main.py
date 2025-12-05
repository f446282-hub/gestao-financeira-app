# backend/main.py
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, schemas, models
from .database import engine, get_db

# Cria as tabelas no banco (se ainda não existirem)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestão Financeira API",
    description="API para gerenciamento de receitas, despesas e cartões de crédito",
    version="1.0.0"
)

# CORS liberado para desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- HEALTH CHECK ----------

@app.get("/api/health")
def health_check():
    """Endpoint para verificar se a API está funcionando"""
    return {
        "status": "ok",
        "message": "API está funcionando corretamente",
        "version": "1.0.0"
    }


@app.get("/")
def root():
    """Endpoint raiz com informações da API"""
    return {
        "message": "API de Gestão Financeira",
        "docs": "/docs",
        "health": "/api/health"
    }


# ---------- REVENUES ----------

@app.get("/api/receitas", response_model=List[schemas.RevenueOut])
def listar_receitas(db: Session = Depends(get_db)):
    """Lista todas as receitas cadastradas"""
    return crud.get_revenues(db)


@app.post("/api/receitas", response_model=schemas.RevenueOut, status_code=201)
def criar_receita(data: schemas.RevenueCreate, db: Session = Depends(get_db)):
    """Cria uma nova receita"""
    return crud.create_revenue(db, data)


@app.get("/api/receitas/{receita_id}", response_model=schemas.RevenueOut)
def obter_receita(receita_id: int, db: Session = Depends(get_db)):
    """Obtém uma receita específica por ID"""
    receita = crud.get_revenue(db, receita_id)
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return receita


@app.put("/api/receitas/{receita_id}", response_model=schemas.RevenueOut)
def atualizar_receita(
    receita_id: int, data: schemas.RevenueUpdate, db: Session = Depends(get_db)
):
    """Atualiza uma receita existente"""
    receita = crud.update_revenue(db, receita_id, data)
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return receita


@app.delete("/api/receitas/{receita_id}")
def excluir_receita(receita_id: int, db: Session = Depends(get_db)):
    """Exclui uma receita"""
    ok = crud.delete_revenue(db, receita_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    return {"ok": True, "message": "Receita excluída com sucesso"}


# ---------- EXPENSES ----------

@app.get("/api/despesas", response_model=List[schemas.ExpenseOut])
def listar_despesas(db: Session = Depends(get_db)):
    """Lista todas as despesas cadastradas"""
    return crud.get_expenses(db)


@app.post("/api/despesas", response_model=schemas.ExpenseOut, status_code=201)
def criar_despesa(data: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    """Cria uma nova despesa"""
    return crud.create_expense(db, data)


@app.get("/api/despesas/{despesa_id}", response_model=schemas.ExpenseOut)
def obter_despesa(despesa_id: int, db: Session = Depends(get_db)):
    """Obtém uma despesa específica por ID"""
    despesa = crud.get_expense(db, despesa_id)
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return despesa


@app.put("/api/despesas/{despesa_id}", response_model=schemas.ExpenseOut)
def atualizar_despesa(
    despesa_id: int, data: schemas.ExpenseUpdate, db: Session = Depends(get_db)
):
    """Atualiza uma despesa existente"""
    despesa = crud.update_expense(db, despesa_id, data)
    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return despesa


@app.delete("/api/despesas/{despesa_id}")
def excluir_despesa(despesa_id: int, db: Session = Depends(get_db)):
    """Exclui uma despesa"""
    ok = crud.delete_expense(db, despesa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")
    return {"ok": True, "message": "Despesa excluída com sucesso"}


# ---------- CREDIT CARDS ----------

@app.get("/api/cartoes", response_model=List[schemas.CreditCardOut])
def listar_cartoes(db: Session = Depends(get_db)):
    """Lista todos os cartões de crédito cadastrados"""
    return crud.get_credit_cards(db)


@app.post("/api/cartoes", response_model=schemas.CreditCardOut, status_code=201)
def criar_cartao(data: schemas.CreditCardCreate, db: Session = Depends(get_db)):
    """Cria um novo cartão de crédito"""
    return crud.create_credit_card(db, data)


@app.get("/api/cartoes/{cartao_id}", response_model=schemas.CreditCardOut)
def obter_cartao(cartao_id: int, db: Session = Depends(get_db)):
    """Obtém um cartão específico por ID"""
    cartao = crud.get_credit_card(db, cartao_id)
    if not cartao:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return cartao


@app.put("/api/cartoes/{cartao_id}", response_model=schemas.CreditCardOut)
def atualizar_cartao(
    cartao_id: int, data: schemas.CreditCardUpdate, db: Session = Depends(get_db)
):
    """Atualiza um cartão de crédito existente"""
    cartao = crud.update_credit_card(db, cartao_id, data)
    if not cartao:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return cartao


@app.delete("/api/cartoes/{cartao_id}")
def excluir_cartao(cartao_id: int, db: Session = Depends(get_db)):
    """Exclui um cartão de crédito"""
    ok = crud.delete_credit_card(db, cartao_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return {"ok": True, "message": "Cartão excluído com sucesso"}


# ---------- CREDIT CARD TRANSACTIONS ----------

@app.get(
    "/api/transacoes-cartao", response_model=List[schemas.CreditCardTransactionOut]
)
def listar_transacoes_cartao(db: Session = Depends(get_db)):
    """Lista todas as transações de cartão de crédito"""
    return crud.get_credit_card_transactions(db)


@app.post(
    "/api/transacoes-cartao", response_model=schemas.CreditCardTransactionOut, status_code=201
)
def criar_transacao_cartao(
    data: schemas.CreditCardTransactionCreate, db: Session = Depends(get_db)
):
    """Cria uma nova transação de cartão de crédito"""
    # Verifica se o cartão existe
    card = crud.get_credit_card(db, data.card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return crud.create_credit_card_transaction(db, data)


@app.get(
    "/api/transacoes-cartao/{transacao_id}",
    response_model=schemas.CreditCardTransactionOut,
)
def obter_transacao_cartao(transacao_id: int, db: Session = Depends(get_db)):
    """Obtém uma transação específica por ID"""
    transacao = crud.get_credit_card_transaction(db, transacao_id)
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transacao


@app.put(
    "/api/transacoes-cartao/{transacao_id}",
    response_model=schemas.CreditCardTransactionOut,
)
def atualizar_transacao_cartao(
    transacao_id: int,
    data: schemas.CreditCardTransactionUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza uma transação de cartão de crédito"""
    transacao = crud.update_credit_card_transaction(db, transacao_id, data)
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transacao


@app.delete("/api/transacoes-cartao/{transacao_id}")
def excluir_transacao_cartao(transacao_id: int, db: Session = Depends(get_db)):
    """Exclui uma transação de cartão de crédito"""
    ok = crud.delete_credit_card_transaction(db, transacao_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"ok": True, "message": "Transação excluída com sucesso"}
