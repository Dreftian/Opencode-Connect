# Opencode Connect (`dsh-plugin-opencode-connect`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DeepSeek Harness Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-blueviolet)](https://www.deepseek.com/en/harness/)
[![OpenCode Desktop](https://img.shields.io/badge/OpenCode-Desktop%20Free%20Models-green)](https://opencode.ai)

[English](#english) | [Español](#español)

---

<a name="español"></a>
## 🇪🇸 Español

Plugin oficial para **DeepSeek Harness** que conecta y sincroniza automáticamente todos los modelos gratuitos de **OpenCode Desktop** como proveedores de modelos LLM dentro de tus sesiones y agentes de DeepSeek Harness.

### 🌟 Características Principales

- **Conexión Automatizada sin API Keys**: Detecta la instalación local de OpenCode Desktop (`opencode-cli`) en Windows, macOS o Linux y establece la conexión de forma transparente.
- **Sincronización Automática de Modelos en Tiempo Real**: Si OpenCode añade nuevos modelos gratuitos o actualizas tu catálogo, el plugin los detecta periódicamente y actualiza la lista disponible en DeepSeek Harness sin reiniciar.
- **Soporte Completo de Streaming y Razonamiento (Thinking)**: Mapea los bloques nativos de pensamiento (`thinking_delta`) y texto (`text_delta`) para una experiencia de chat y generación fluida.
- **Manejo Inteligente de Rate Limits**: Notificaciones claras ante límites de uso temporal o estado del servicio.

### 📋 Modelos Gratuitos Soportados de OpenCode

El plugin detecta y activa automáticamente los modelos gratuitos disponibles en OpenCode Desktop:

| Modelo ID | Nombre en DeepSeek Harness | Ventana de Contexto | Razonamiento (Thinking) | Modalidades |
| :--- | :--- | :---: | :---: | :---: |
| `opencode/beam-free` | Beam Free [Free] | 32k | No | Texto |
| `opencode/big-pickle` | Big Pickle [Free] | 64k | Sí | Texto |
| `opencode/deepseek-v4.1-flash-free` | DeepSeek V4.1 Flash Free [Free] | 128k | Sí | Texto |
| `opencode/glm-5.3-flash-free` | GLM-5.3-Flash Free [Free] | 128k | Sí | Texto |
| `opencode/longcat-2.5-preview-free` | LongCat 2.5 Preview Free [Free] | 256k | No | Texto |
| `opencode/mimo-v2.6-flash-free` | MiMo-V2.6-Flash Free [Free] | 128k | Sí | Texto |
| `opencode/nemotron-3-ultra-free` | Nemotron 3 Ultra Free [Free] | 64k | Sí | Texto |
| `opencode/nemotron-3.5-lightning-free` | Nemotron 3.5 Lightning Free [Free] | 64k | No | Texto |
| `opencode/nemotron-3.5-super-vl-free` | Nemotron 3.5 Super VL Free [Free] | 64k | Sí | Texto, Visión |
| `opencode/space-bunny-free` | Space Bunny Free [Free] | 64k | Sí | Texto |

### 🚀 Instalación en DeepSeek Harness

#### Método 1: Desde la Interfaz Gráfica (Recomendado)
1. Abre **DeepSeek Harness Desktop**.
2. Ve al menú lateral **Complementos** (Plugins).
3. Haz clic en **+ Agregar complemento**.
4. En el campo de texto, ingresa la URL de GitHub:
   ```text
   https://github.com/Dreftian/Opencode-Connect
   ```
   *(O el nombre del paquete: `dsh-plugin-opencode-connect` o la ruta de tu carpeta local)*.
5. Haz clic en **Instalar**.

#### Método 2: Mediante CLI de DeepSeek Harness
Si utilizas DeepSeek Harness vía terminal o Web UI:
```bash
dsh plugin add dsh-plugin-opencode-connect
```
O añade el overlay en tu perfil mediante `cordis.patch.yml`:
```yaml
- insert:
    - id: llm-opencode-connect
      name: dsh-plugin-opencode-connect
```

#### Método 3: Enlace Local (Desarrollo)
```bash
git clone https://github.com/Dreftian/Opencode-Connect.git
cd Opencode-Connect
npm install
npm run build
```
Luego en DeepSeek Harness selecciona "Agregar complemento" e introduce la ruta absoluta del directorio.

### ⚙️ Configuración (Opcional)

Puedes personalizar las opciones en tu archivo de configuración de Cordis / Harness:
```yaml
dsh-plugin-opencode-connect:
  # Ruta personalizada del binario opencode-cli (si no está en ubicaciones estándar)
  cliPath: ""
  # Intervalo de sincronización de modelos en milisegundos (por defecto: 30000ms / 30s)
  syncIntervalMs: 30000
  # Si solo se deben registrar los modelos gratuitos (por defecto: true)
  onlyFreeModels: true
  # Prefijo del proveedor en DeepSeek Harness (por defecto: "opencode")
  providerId: "opencode"
```

---

<a name="english"></a>
## 🇬🇧 English

DeepSeek Harness plugin that connects and automatically synchronizes all free models from **OpenCode Desktop** as native LLM providers in your DeepSeek Harness sessions and agents.

### 🌟 Key Features

- **Automated Zero-Config Connection**: Automatically detects your local `opencode-cli` installation on Windows, macOS, or Linux.
- **Dynamic Real-Time Model Sync**: Whenever OpenCode updates, adds new models, or changes availability, the plugin detects the changes and refreshes the DeepSeek Harness catalog automatically.
- **Full Streaming & Thinking Support**: Emits native `thinking_delta` reasoning blocks and `text_delta` response chunks seamlessly.
- **Graceful Fault-Tolerance**: Handles OpenCode restarts, temporary rate limits, and service updates without crashing.

### 📋 Supported Free Models

| Model ID | DeepSeek Harness Name | Context Window | Reasoning (Thinking) | Modalities |
| :--- | :--- | :---: | :---: | :---: |
| `opencode/beam-free` | Beam Free [Free] | 32k | No | Text |
| `opencode/big-pickle` | Big Pickle [Free] | 64k | Yes | Text |
| `opencode/deepseek-v4.1-flash-free` | DeepSeek V4.1 Flash Free [Free] | 128k | Yes | Text |
| `opencode/glm-5.3-flash-free` | GLM-5.3-Flash Free [Free] | 128k | Yes | Text |
| `opencode/longcat-2.5-preview-free` | LongCat 2.5 Preview Free [Free] | 256k | No | Text |
| `opencode/mimo-v2.6-flash-free` | MiMo-V2.6-Flash Free [Free] | 128k | Yes | Text |
| `opencode/nemotron-3-ultra-free` | Nemotron 3 Ultra Free [Free] | 64k | Yes | Text |
| `opencode/nemotron-3.5-lightning-free` | Nemotron 3.5 Lightning Free [Free] | 64k | No | Text |
| `opencode/nemotron-3.5-super-vl-free` | Nemotron 3.5 Super VL Free [Free] | 64k | Yes | Text, Vision |
| `opencode/space-bunny-free` | Space Bunny Free [Free] | 64k | Yes | Text |

### 🚀 Installation in DeepSeek Harness

#### Method 1: Via Desktop GUI (Recommended)
1. Open **DeepSeek Harness Desktop**.
2. Navigate to **Complementos** / **Plugins** in the sidebar.
3. Click **+ Agregar complemento** / **+ Add Plugin**.
4. Enter the GitHub repository URL:
   ```text
   https://github.com/Dreftian/Opencode-Connect
   ```
   *(Or package name `dsh-plugin-opencode-connect` or local folder path)*.
5. Click **Instalar** / **Install**.

#### Method 2: Via DeepSeek Harness CLI
```bash
dsh plugin add dsh-plugin-opencode-connect
```
Or insert into your profile patch (`cordis.patch.yml`):
```yaml
- insert:
    - id: llm-opencode-connect
      name: dsh-plugin-opencode-connect
```

#### Method 3: Local Directory
```bash
git clone https://github.com/Dreftian/Opencode-Connect.git
cd Opencode-Connect
npm install
npm run build
```
In DeepSeek Harness, provide the local directory path in the Add Plugin dialog.

### 🧪 Development & Testing

```bash
# Build TypeScript
npm run build

# Run automated test suite
npm test
```

### 📄 License

[MIT](LICENSE) © 2026 [Dreftian](https://github.com/Dreftian)
