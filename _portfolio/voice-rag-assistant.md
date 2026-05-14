---
title: "Annai: Voice-Enabled RAG Architecture"
excerpt: "A scalable, multi-lingual AI assistant utilizing a Pinecone Vector Database, LangChain, and Vercel Serverless with intelligent TTS fallback routing."
collection: portfolio
---

## Overview
To demonstrate production-grade LLM engineering, I built "Annai"—a custom Retrieval-Augmented Generation (RAG) assistant integrated directly into this portfolio. Instead of utilizing basic API wrappers, this system relies on a standalone serverless backend and a dedicated vector database to answer complex technical queries about my work with zero hallucinations.

## The ETL Data Pipeline
The system's knowledge base is generated via a custom Node.js ETL (Extract, Transform, Load) script. It chunks my raw markdown project files, embeds the text using Google's `text-embedding-004` model, and indexes the vectors into a **Pinecone Serverless Database** alongside relational metadata (such as GitHub URLs).

## Serverless Orchestration & Memory
When a user speaks into the microphone on the frontend, the browser's native Web Speech API transcribes the audio and POSTs it to a **Vercel Serverless Function**. 
* **LangChain.js** manages the orchestration, maintaining conversational memory.
* If a user asks a follow-up question using pronouns, the LLM executes a *Contextualize Question* step to rewrite the query before executing the cosine similarity search against Pinecone.
* The system utilizes **Gemini 1.5 Flash** for high-speed generation, strictly constrained to outputting contextually accurate answers in either English or Hindi depending on the user's input.

## Highly Available Audio Synthesis
To ensure the 3D avatar maintains a premium voice without incurring massive API costs, the backend implements an automated fallback routing strategy. It attempts to synthesize speech via **ElevenLabs**, but if quotas are exhausted, it catches the 401 error and dynamically reroutes the payload to **Google Cloud Neural TTS**, guaranteeing 100% uptime for the user interface.
