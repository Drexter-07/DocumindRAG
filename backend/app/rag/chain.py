from typing import TypedDict, List
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from langchain_core.documents import Document as LCDocument

from app.core.config import settings
from app.rag.retrieval import get_retriever


class AgentState(TypedDict):
    question: str
    chat_history: List[BaseMessage]
    org_id: int  # ✅ NEW
    context: List[LCDocument]   # ✅ Store actual docs
    answer: str


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, openai_api_key=settings.OPENAI_API_KEY)
retriever = get_retriever()


def contextualize_question(state: AgentState):
    question = state["question"]
    chat_history = state.get("chat_history", [])

    if not chat_history:
        return {"question": question}

    system_prompt = """Given a chat history and the latest user question 
which might reference context in the chat history, formulate a standalone question 
which can be understood without the chat history. Do NOT answer the question, 
just reformulate it if needed and otherwise return it as is."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    chain = prompt | llm | StrOutputParser()
    new_question = chain.invoke({"chat_history": chat_history, "question": question})
    return {"question": new_question}


def retrieve_node(state: AgentState):
    question = state["question"]
    org_id = state["org_id"]

    documents = retriever.invoke(question, org_id)
    return {"context": documents}  # ✅ preserve docs + metadata


def generate_node(state: AgentState):
    question = state["question"]
    docs = state["context"]   # ✅ this is List[LCDocument]

    # ✅ Convert docs -> structured string labeling patches vs chunks
    context_parts = []
    for doc in docs:
        if doc.metadata.get("source") == "patch":
            context_parts.append(f"[EXPERT CORRECTION PATCH]: {doc.page_content}")
        else:
            context_parts.append(f"[ORIGINAL DOCUMENT]: {doc.page_content}")
            
    context_text = "\n\n".join(context_parts)

    template = """You are a highly accurate QA assistant.
Use the following pieces of retrieved context to answer the question. 

CRITICAL RULE: The context contains both [ORIGINAL DOCUMENT] excerpts and [EXPERT CORRECTION PATCH] excerpts. 
If an [EXPERT CORRECTION PATCH] contradicts or updates information found in an [ORIGINAL DOCUMENT], you MUST treat the [EXPERT CORRECTION PATCH] as the absolute ground truth and ignore the outdated original document.

If you don't know the answer based on the context, just say that you don't know.

Question: {question}
Context: 
{context}

Answer:"""

    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | llm | StrOutputParser()

     # ✅ pass context_text instead of docs list
    response = chain.invoke({"question": question, "context": context_text})
    return {"answer": response}


workflow = StateGraph(AgentState)
workflow.add_node("contextualize", contextualize_question)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)

workflow.set_entry_point("contextualize")
workflow.add_edge("contextualize", "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

rag_chain = workflow.compile()
