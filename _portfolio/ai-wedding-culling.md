---
title: "AI Wedding Culling System"
seo_title: "AI Wedding Culling System | YOLOv8, CLIP & MTCNN Computer Vision Pipeline"
description: "An automated computer vision pipeline using YOLOv8, CLIP ViT-L/14, MTCNN, and FastAPI for high-throughput wedding photo culling, blur detection, and semantic image clustering."
excerpt: "An AI-powered image processing backend to rapidly evaluate and filter raw wedding photography folders."
collection: portfolio
---

**Summary:** An automated REST pipeline that evaluates massive bursts of wedding photos to filter out bad shots and group duplicates.

*   **Problem:** Wedding photographers spend countless hours manually culling thousands of burst shots, wasting time identifying blurry images, closed eyes, and redundant frames.
*   **Solution:** Deployed an automated pipeline that evaluates images using facial landmark detection to reject poor photos (motion blur, closed eyes). It also utilizes embedding clustering to group near-duplicate burst shots and specialized models to preserve images of enrolled VIPs.
*   **Tech Stack:** Python, FastAPI, YOLOv8n, MediaPipe FaceMesh, CLIP ViT-L/14, OpenCV, MTCNN.
*   **Outcome:** Drastically reduced manual review time for photographers by reliably automating the rejection of low-quality images and intelligently organizing vast datasets.

### Pipeline Architecture

```mermaid
flowchart TD
    A["📂 Raw Photo Folder\n(1000+ images)"] --> B["FastAPI Endpoint\n/api/v1/cull"]
    
    B --> C["Stage 1: Face Detection\n(YOLOv8n)"]
    C --> D{"Faces\nDetected?"}
    D -->|No| E["Flag: No Subject"]
    D -->|Yes| F["Stage 2: Quality Check\n(MediaPipe FaceMesh)"]
    
    F --> G{"Eyes Open?\nNo Blur?\nGood Exposure?"}
    G -->|Fail| H["🗑️ Reject Bin"]
    G -->|Pass| I["Stage 3: Embedding\n(CLIP ViT-L/14)"]
    
    I --> J["L2 Distance\nClustering"]
    J --> K["Duplicate Groups\n(Near-identical bursts)"]
    K --> L["Select Best\nper Group"]
    
    I --> M["Stage 4: VIP Match\n(FaceNet + MTCNN)"]
    M --> N{"Match with\nEnrolled VIP?"}
    N -->|Yes| O["⭐ VIP Priority\n(Always Keep)"]
    N -->|No| L
    
    L --> P["✅ Final Curated Set"]
    O --> P
```

*   **What I learned:** Mastered chaining multiple heavy computer vision models in a FastAPI backend and handling complex vector mathematics (L2 distance) for accurate image clustering.