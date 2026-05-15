---
title: "Annai: Voice-Enabled RAG Architecture"
seo_title: "Annai Voice RAG Assistant | Pinecone, Gemini LLM & Vercel Serverless API"
description: "A production-grade voice-enabled RAG assistant using Pinecone vector database, Gemini 1.5 Flash LLM, Vercel Serverless Functions, and Google Cloud TTS with a zero-LangChain architecture."
excerpt: "A scalable, self-aware AI assistant utilizing a Pinecone Vector Database and Vercel Serverless with a highly optimized Zero-LangChain architecture."
collection: portfolio
---

## Overview
To demonstrate production-grade LLM engineering, I built "Annai"—a custom Retrieval-Augmented Generation (RAG) assistant integrated directly into this portfolio. Instead of utilizing basic API wrappers or heavy abstraction frameworks, this system relies on a lightweight, standalone serverless backend and a dedicated vector database to answer complex technical queries about my work with zero hallucinations. 

Annai is entirely self-aware and capable of intelligently describing her own architecture and creation process to users.

## The ETL Data Pipeline
The system's knowledge base is generated via a custom Node.js ETL (Extract, Transform, Load) script. This script automatically wipes stale ghost vectors from the database to ensure pristine data hygiene, chunks my raw project files, embeds the text using Google's `gemini-embedding-001` model, and indexes the vectors into a **Pinecone Serverless Database** alongside relational metadata (such as GitHub URLs and detailed portfolio deep links).

## Zero-LangChain Serverless Orchestration
When a user speaks into the microphone on the frontend, the browser's native Web Speech API transcribes the audio and POSTs it to a **Vercel Serverless Function**. 

I intentionally engineered a **Zero-LangChain** architecture, utilizing raw `fetch` for all API calls to minimize cold-start latency and reduce bundle size. The backend manages conversational memory automatically. If a user asks a follow-up question using pronouns, the LLM executes a *Contextualize Question* step to rewrite the query before executing the cosine similarity search against Pinecone.

The system utilizes **Gemini 1.5 Flash** for high-speed generation. Annai is locked behind a strict grounding prompt that completely forbids hallucinations—if a question falls outside the scope of my top 5 core projects, she politely declines.

## Low-Latency Audio Synthesis & State Persistence
To ensure the 3D avatar maintains a premium, fast-responding voice, the backend relies exclusively on **Google Cloud Neural2 TTS**. By stripping away third-party fallback dependencies, the system achieves incredibly low latency for voice generation. 

On the frontend side, the chat widget implements `sessionStorage` persistence, guaranteeing that a user's conversation history and chat window state remain fully intact even as they navigate across different pages of the portfolio.
