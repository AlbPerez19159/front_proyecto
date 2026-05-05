# Árbol3D — Frontend

Interfaz web para el generador paramétrico de modelos de árboles 3D para dioramas.

> 🔗 **Repositorio backend:** [github.com/AlbPerez19159/back-end_proyecto](https://github.com/AlbPerez19159/back-end_proyecto)

## Tecnologías

- HTML5 + CSS3 + JavaScript vanilla
- [Three.js r128](https://threejs.org/) — visualización 3D en navegador

## Estructura

```
frontend/
├── index.html        # Página principal
├── css/
│   └── style.css     # Estilos (dark theme, DM Mono + Fraunces)
└── js/
    ├── tree.js       # Motor 3D: escena Three.js, generación del árbol
    └── main.js       # Lógica de controles, estado y llamadas al backend
```

## Uso

Abre `index.html` directamente en el navegador (no requiere bundler).

Para que el botón **Generar STL** funcione, el backend debe estar corriendo en `http://localhost:8000`.  
La vista 3D previa funciona sin backend.

## Configuración del backend

Edita la constante al inicio de `js/main.js`:

```js
const API_URL = 'http://localhost:8000';
```

## Especies disponibles

| Valor | Especie |
|-------|---------|
| `roble` | Quercus robur |
| `pino` | Pinus radiata |
| `sauce` | Salix babylonica |
| `muerto` | Árbol muerto |

## Escalas de diorama

| Escala | Uso típico |
|--------|-----------|
| 1:87 (HO) | Ferromodelismo |
| 1:72 | Maquetas militares |
| 1:48 (O) | Ferromodelismo grande |
| 1:35 | Maquetas militares detalladas |
