# 📱 Protótipo de Scanner de Peças Automotivas com Câmera do Celular — Ecoficina

Documento de planejamento técnico, requisitos e arquitetura para criação do protótipo de scanner de peças via câmera mobile.

---

## 🎯 Objetivo
Permitir que motoristas de frotas e mecânicos em oficinas apontem a câmera do celular para uma peça desgastada ou danificada e obtenham:
1. **Identificação instantânea da peça** (tipo, modelo do veículo, compatibilidade).
2. **Diagnóstico de viabilidade de recondicionamento** (se é possível reaproveitar ou substituir partes com polímeros reforçados como Nylon Fibra de Carbono, TPU ou ABS).
3. **Orçamento e impacto ecológico** (economia em R$ vs peça nova e CO₂ evitado).
4. **Visualização 3D da peça recondicionada** pronta para manufatura aditiva.

---

## 🔬 Abordagens Tecnológicas

### 1. Nível 1 — Scanner Visual Inteligente com IA de Visão (Recomendado)
- **Tecnologia:** Câmera Web (`getUserMedia`) + Processamento de Imagem / IA Multimodal.
- **Vantagens:** Funciona instantaneamente pelo navegador do celular sem instalar apps da Play Store ou App Store.
- **Como opera:** O usuário enquadra a peça dentro da mira holográfica/AR. O sistema capta um frame nítido e extrai os metadados técnicos, associando com o catálogo de impressão 3D da Ecoficina.

### 2. Nível 2 — Scanner com Medição Métrica Dimensional
- **Tecnologia:** Visão computacional com OpenCV (detecção de bordas e marcadores ArUco/ChArUco ou cartão de referência).
- **Como opera:** A peça é colocada sobre uma base de calibração ou ao lado de um objeto de dimensões conhecidas. O algoritmo calcula a escala em milímetros (pixels/mm) para conferir se as furações e tolerâncias estão dentro do padrão.

### 3. Nível 3 — Fotogrametria 3D Completa (Gerador de malhas .STL)
- **Tecnologia:** Captura de 20 a 50 fotos em 360° da peça processadas por *Structure from Motion* (SfM) ou NeRF.
- **Observação:** Peças automotivas escuras, com óleo ou reflexos metálicos costumam necessitar de boa iluminação e pós-processamento para gerar malhas perfeitas para impressão.

---

## 🏗️ Arquitetura do Protótipo na Pasta `scanner/`

```
scanner/
├── index.html           # Interface do scanner (visor de câmera com reticulado AR e HUD)
├── style.css            # Estilos mobile-first, dark industrial e animações laser/mira
├── app.js               # Conexão com a câmera traseira do celular e controles
├── scanner-engine.js    # Motor de diagnóstico, catálogo de peças e cálculo de economia
└── assets/              # Modelos 3D (.glb), ícones e elementos visuais
```

---

## ⚙️ Fluxo do Usuário no Protótipo

1. **Abertura:** O usuário abre o link no celular e autoriza a câmera.
2. **Mira AR:** A tela exibe um reticulado dinâmico com guia central e indicador de foco/luz.
3. **Escaneamento:** O usuário clica em **"Escanear Peça"** — uma animação de laser escaneia a tela.
4. **Ficha Técnica & Diagnóstico:**
   - Nome da peça (ex: *Coxim Traseiro do Motor*).
   - Grau de desgaste (*Moderado / Recondicionável*).
   - Filamento técnico indicado (*Nylon CF + TPU*).
   - Economia estimada (*Ex: R$ 340,00 de economia*).
5. **Pré-visualização 3D:** Renderização tridimensional interativa onde o usuário gira a peça na tela e pode clicar em **"Enviar para Impressão 3D"**.
