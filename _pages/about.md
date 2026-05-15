---
layout: archive
title: "Chhayansh Porwal"
seo_title: "Chhayansh Porwal | AI Enthusiast & Software Developer"
description: "Software Developer bridging native Android architecture, computer vision pipelines, and full-stack AI architectures."
permalink: /
author_profile: true
---

I am a 3rd-year B.Tech Computer Science Engineering student at Rajasthan Technical University (CGPA: 8.81) and a Software Engineer specializing in native Android architecture, computer vision pipelines, and full-stack ML systems. My technical philosophy centers on deep engineering fundamentals — moving beyond surface-level integrations to understand system-level APIs and custom software architecture.

I have hands-on industry experience building AI-powered products: from chaining YOLOv8 + CLIP + MTCNN for an automated wedding photo culling system at Fotographiya, to architecting ML-driven matching engines with SentenceTransformers at Syon Technologies. My competitive research work on 3D Noise2Void denoising earned **Global Rank 2** at the AI4Life International Grand Challenge.

I am currently studying the Japanese language and actively preparing my engineering foundation to enter the Japanese tech market as a fresh graduate.

## Achievements

- 🏆 **Global Rank 2** — AI4Life International Grand Challenge (Calcium Imaging Denoising)
- 🎯 **Top 8% Nationwide** — AlgoUniversity Tech Fellowship (ATF 2025)
- 📊 **CGPA: 8.81** — Rajasthan Technical University, B.Tech CSE (Till 5th Semester)

---

## Featured Work & Technical Deep Dives

Below is a detailed technical overview of my core engineering systems and research. Each project is engineered from scratch, focusing on performance, system-level architecture, and production readiness.

### 1. Research: 3D Calcium Imaging Denoising (Global Rank 2)

[<i class="fab fa-fw fa-github"></i> Verify Code Repository](https://github.com/chhayanshporwal/3d-n2v-calcium-denoising.git) | [Read Full Publication](/publications/ai4life-grand-challenge)

**The Challenge:** In biological research, capturing volumetric (3D) video of live cells requires extremely low light to prevent phototoxicity, resulting in massive visual noise. Standard supervised learning is impossible because acquiring clean "ground truth" reference data physically destroys the cellular sample.

**Technical Overview & Flow:** I developed a self-supervised image restoration pipeline to denoise this volumetric microscopy data. The system utilizes a **3D Noise2Void (N2V)** neural network. The pipeline ingests high-dimensional 3D TIFF stacks, mathematically masks random pixels (blind-spot masking), and forces the UNet encoder-decoder architecture to predict the missing values based strictly on spatial neighborhoods. Because cellular topography is continuous while noise is mathematically random, the network learns to extract clean biological signals while entirely ignoring the noise.

**Tech Stack Rationale:**

- **PyTorch & 3D UNet:** Chosen for fine-grained tensor control over multi-frame 3D sequences, allowing custom spatial augmentations that fit within standard GPU memory limits.
- **Docker:** Ensured the pipeline was perfectly reproducible and easily deployable on the Grand Challenge evaluation servers, leading directly to my **Global Rank 2** finish.

---

### 2. Engineering: CallSentry Native Android Security

[<i class="fab fa-fw fa-github"></i> Verify Code Repository](https://github.com/chhayanshporwal/CallSentry.git) | [View Portfolio Case Study](/portfolio/callsentry/)

**The Challenge:** Standard Android privacy apps often rely on cross-platform wrappers or route data through external servers, leading to latency and severe privacy risks. I needed a system-level interceptor that operates entirely natively on-device, offering strict whitelist blocking while ensuring critical emergency calls can bypass "Do Not Disturb" rules.

**Technical Overview & Flow:** CallSentry is built strictly natively, executing directly within the OS environment. The app registers low-level **Broadcast Receivers** and **Notification Listener Services** to seamlessly monitor incoming telephony states. When a call arrives, the background service immediately queries an encrypted local database. If the number is restricted, the call is dropped or silenced dynamically. Conversely, the Emergency Breakthrough algorithm intelligently overrides OS-level restrictions to ensure vital contacts reach the user instantly.

**Tech Stack Rationale:**

- **Native Kotlin & Jetpack Compose:** Cross-platform tools (Flutter/React Native) are too abstracted for deep system-level APIs. Kotlin provides direct access to Android's `TelephonyManager`, while Compose ensures a highly reactive, state-driven UI.
- **MVVM & Room DB:** The Model-View-ViewModel architecture combined with Kotlin Coroutines provides asynchronous, thread-safe access to the encrypted Room Database, resulting in zero-latency execution during high-stress call events.

---

### 3. Engineering: AI Wedding Image Culling Suite

[<i class="fab fa-fw fa-github"></i> Verify Code Repository](https://github.com/chhayanshporwal/AI-Wedding-Culling-Suite.git) | [View Portfolio Case Study](/portfolio/ai-wedding-culling/)

**The Challenge:** Event photographers manually review thousands of raw shots, wasting days deleting blurry, blinking, or duplicate photos. This system replaces that manual labor by passing massive galleries through an automated, high-throughput computer vision pipeline.

**Technical Overview & Flow:** The architecture orchestrates specialized AI models in sequence:

1.  **Mathematical Pre-filtering:** Calculates the variance of the Laplacian to instantly drop photos falling below a strict mathematical sharpness threshold (blur rejection).
2.  **Subject Validation:** Integrates **YOLOv8** to verify human subjects are the focal point of the remaining frames.
3.  **Facial Landmark Mapping:** Uses **MTCNN** to analyze faces, detecting closed eyes or poor expressions.
4.  **Semantic Clustering:** Converts surviving images into high-dimensional vector embeddings using OpenAI's **CLIP (ViT-L/14)**. By computing cosine similarity, the system clusters photos based on _meaning_ (handling burst shots with slight camera movement) and extracts only the single highest-scoring shot from each cluster.

**Tech Stack Rationale:**

- **YOLOv8, MTCNN, & CLIP:** Chaining these specific models sequentially drastically reduces computational overhead; cheap mathematical operations discard obvious trash before expensive tensor embeddings are forced to run.
- **FastAPI:** Selected because Python's standard synchronous frameworks block during heavy GPU inference. FastAPI's asynchronous routing allows massive batch processing of galleries without locking the server.

---

### 4. Engineering: Annai Voice-Enabled RAG Architecture

[<i class="fab fa-fw fa-github"></i> Verify Code Repository](https://github.com/chhayanshporwal/voice-rag-backend.git) | [View Portfolio Case Study](/portfolio/voice-rag-assistant/)

**The Challenge:** Static portfolios fail to convey the depth of engineering work. I needed a production-grade conversational AI that could answer complex technical questions about my work in multiple languages, with zero hallucinations, natively integrated into the site's UI.

**Technical Overview & Flow:** The pipeline begins with a custom Node.js ETL script that chunks my portfolio markdown files, embeds them via Google's `text-embedding-004`, and indexes them into a Pinecone vector database. On the frontend, a 3D VRM avatar captures user voice/text and POSTs it to a Vercel Serverless Function. The backend manages conversational memory, executing a _Contextualize Question_ step via Gemini to handle pronouns. It then retrieves the top Pinecone chunks and generates a strictly English or Hindi response. Finally, the response routes through a multi-tier TTS fallback chain (ElevenLabs to Google Cloud TTS) and streams base64 audio back to the frontend, syncing flawlessly with the 3D avatar's skeletal animation.

**Tech Stack Rationale:**

- **Pinecone & Gemini 1.5 Flash:** Provides the instantaneous vector retrieval and high-speed generation necessary for a responsive, voice-driven user interface.
- **Serverless TTS Fallback:** ElevenLabs provides premium voice synthesis, but API quotas are unpredictable. Hardcoding a dynamic fallback routing system to Google Cloud Neural TTS guarantees 100% uptime for the portfolio's interactive widget.
- **Three.js & @pixiv/three-vrm:** Chosen to render and animate the skeletal mesh of the 3D avatar interactively in the browser without inducing massive WebGL overhead.

---

### 5. Engineering: AI Teacher Recruitment System

[<i class="fab fa-fw fa-github"></i> Verify Code Repository](https://github.com/chhayanshporwal/teacher-recruitment-system.git) | [View Portfolio Case Study](/portfolio/teacher-recruitment-system/)

**The Challenge:** The hiring process for schools is highly fragmented, lacking a unified platform to simultaneously handle candidate applications, school job postings, and overarching system administration—let alone intelligently match candidates to opportunities based on semantic meaning rather than just keyword matching.

**Technical Overview & Flow:** I architected a full-stack web platform with an integrated ML matching engine to centralize the hiring process. The system operates on two distinct backends. The core application logic (user management, applications, roles) runs on a **Node.js/Prisma** backend. When a school posts a job or a teacher updates a profile, the data is pushed via REST APIs to a dedicated **Python/FastAPI microservice**. This ML service utilizes **SentenceTransformers** to generate semantic embeddings of resumes and job descriptions. By calculating the cosine similarity between candidate profiles and job requirements, the system outputs ranked, intelligent matches.

**Tech Stack Rationale:**

- **Next.js, Node.js, & Prisma:** Selected for the core application to ensure type safety across the stack with TypeScript and rapidly scale the complex relational database (candidates, schools, admins, applications) using Prisma ORM.
- **FastAPI & SentenceTransformers:** Python is mandatory for the ML matching engine, but integrating it directly into the Node.js monolith would block the event loop. Separating the ML workload into a FastAPI microservice allows heavy embedding generation to happen asynchronously without freezing the frontend user portals.
- **Redis:** Used to cache the generated embeddings and facilitate high-speed data handoffs between the TypeScript and Python services.
