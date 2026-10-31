# METALHIVE

Arcade vertical de naves, nativo para **iPhone, iPad y Mac** (Swift + SpriteKit), pensado para publicarse en App Store.
Homenaje a los arcades clásicos de los 80: física de impactos metálicos, sonido táctil y una pantalla que siempre se entiende.

Biblia de concepto: [`docs/BIBLIA.md`](docs/BIBLIA.md) · referencias de nave: [`docs/referencias/`](docs/referencias/).

## Abrir y ejecutar

Requiere **Xcode 16 o superior** en un Mac.

1. Abrí `MetalHive.xcodeproj`.
2. Seleccioná el target **MetalHive** → *Signing & Capabilities* → elegí tu **Team** (tu Apple ID alcanza para probar en tus dispositivos).
   Si Xcode se queja del identificador, cambiá `com.tavo2009.metalhive` por uno propio.
3. Arriba, elegí el destino: un simulador de iPhone/iPad, tu iPhone conectado, o **My Mac**.
4. ▶︎ Run (⌘R).

Un solo target compila para las tres plataformas. iOS 17+ / macOS 14+.

**Controles**
- iPhone/iPad: arrastrá en cualquier lugar (movimiento relativo: el dedo no tapa la nave) · disparo automático · botón **ONDA**.
- Mac: flechas/WASD (o arrastrar con el mouse) · Espacio = onda · P = pausa · M = sonido.
- Mando (Xbox, PlayStation, MFi) en todas: stick/cruceta, A = onda, Menú = pausa.

## Dirección de juego

- **Escala**: la nave vuela a ~5000 m sobre un desierto árido con pocos oasis. El suelo avanza lento (13 pt/s) y casi no
  se corre con la nave; de vez en cuando pasan nubes muy difusas entre el suelo y la acción.
- **Nave** ~53 pt de ancho (≈13 % de un iPhone), campo de juego abierto sin paredes.
- **Efectos sobrios**: destello corto, pocas chispas y restos, textos solo para eventos especiales (choques, placas, mejoras).
- **Combate**: empujes según dónde pega el disparo, choques entre enemigos con daño y cadena, frente blindado del escarabajo,
  placas laterales que se desprenden, aviso visible y audible antes del disparo del tábano, onda de choque.

## Estructura

```
MetalHive.xcodeproj          proyecto (carpeta sincronizada: todo lo que esté en MetalHive/ entra solo)
MetalHive/App                entrada SwiftUI + vista SpriteKit (iOS y macOS)
MetalHive/Engine             texturas, sonido (AVAudioEngine), mandos y teclado
MetalHive/Game               escena, lógica, efectos, HUD, entrada, guion de oleadas
MetalHive/Resources          arte, sonidos y fuente (Black Ops One, licencia OFL) — generados
Config/                      entitlements del Mac (sandbox, requerido por Mac App Store)
tools/assetgen               generador procedural de arte y sonido
```

## Regenerar arte y sonido

El arte (nave, enemigos, terreno, nubes, interfaz, ícono) y los efectos de sonido se generan por código.
Necesita Node 18+, Playwright con Chromium y Python 3 con Pillow:

```bash
npm i -D playwright && npx playwright install chromium
pip3 install pillow
node tools/assetgen/generate.mjs
```

Escribe en `MetalHive/Resources/{Art,Sound}` y en el ícono de `Assets.xcassets`.
