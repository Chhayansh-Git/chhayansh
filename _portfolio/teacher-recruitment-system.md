---
title: "AI Teacher Recruitment System"
seo_title: "AI Teacher Recruitment System | SentenceTransformers, Next.js & Redis ML Platform"
description: "A full-stack ML-powered recruitment platform built with Next.js, Node.js, Prisma, FastAPI, SentenceTransformers, and Redis for intelligent semantic matching between candidates and schools."
excerpt: "A full-stack ML-powered recruitment marketplace connecting candidates, schools, and administrators with intelligent matching."
collection: portfolio
---

**Summary:** A full-stack web platform with an integrated ML matching engine designed to centralize and intelligently streamline the hiring process for educational institutions.

*   **Problem:** The hiring process for schools is highly fragmented, lacking a unified platform that can simultaneously handle candidate applications, school job postings, and overarching system administration — let alone intelligently match candidates to opportunities.
*   **Solution:** Engineered a dedicated Python/FastAPI microservice utilizing SentenceTransformers to generate semantic embeddings for automated resume screening and profile coaching. Integrated the ML service with a Next.js and Node.js/Prisma backend architecture, utilizing REST APIs and Redis for efficient data handoffs. Developed secure backend controllers to serve three distinct user portals (Candidate, School, Admin) from a single unified database.
*   **Tech Stack:** Next.js, Node.js, Prisma, TypeScript, Python, FastAPI, SentenceTransformers, Redis.
*   **Outcome:** Delivered a scalable ML-powered architecture capable of intelligently pairing candidates with schools, supporting dynamic user roles, and handling robust authentication across the platform.

### System Architecture

```mermaid
flowchart TD
    subgraph "Frontend (Next.js + TypeScript)"
        A["🎓 Candidate Portal"]
        B["🏫 School Portal"]
        C["⚙️ Admin Dashboard"]
    end
    
    A --> D["Auth Middleware\n(Role-Based)"]
    B --> D
    C --> D
    
    D --> E{"Role\nCheck"}
    E -->|Candidate| F["Candidate Controller"]
    E -->|School| G["School Controller"]
    E -->|Admin| H["Admin Controller"]
    
    subgraph "Node.js + Prisma Backend"
        F --> I["Profile CRUD"]
        F --> J["Application Manager"]
        F --> K["Job Search API"]
        
        G --> L["Job Posting CRUD"]
        G --> M["Application Review"]
        G --> N["Video Interview\n(Recording)"]
        
        H --> O["User Management"]
        H --> P["Platform Analytics"]
        H --> Q["Content Moderation"]
    end
    
    subgraph "ML Microservice (FastAPI)"
        R["SentenceTransformers\n(Embedding Generation)"]
        S["Semantic Matching\nEngine"]
        T["Resume Screening\n& Profile Coaching"]
    end
    
    K -->|"REST API"| S
    I -->|"REST API"| R
    R --> T
    S --> R
    
    subgraph "Data Layer"
        U[("PostgreSQL\n(Prisma ORM)")]
        V[("Redis\n(Cache + Queue)")]
    end
    
    I --> U
    J --> U
    L --> U
    M --> U
    R -->|"Embedding Cache"| V
    S -->|"Match Results"| V
    
    subgraph "Business Rules"
        W["1-Year Lock-in\nPolicy"]
        X["7-Day Auto-Release"]
        Y["Device Trust\n(Instagram-style)"]
    end
    
    D --> Y
    M --> W
    J --> X
```

*   **What I learned:** Greatly strengthened my full-stack capabilities — particularly in integrating ML microservices with production backends, structuring robust Node.js controllers with Prisma ORM, and managing state across TypeScript and Python services via Redis.