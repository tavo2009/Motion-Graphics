# METALHIVE — prototipo

Arcade vertical ciberorgánico (steampunk ferroso + insectos biomecánicos) pensado para **iPhone y iPad en vertical**.
Biblia de concepto: [`docs/BIBLIA.md`](docs/BIBLIA.md) · referencias de nave: [`docs/referencias/`](docs/referencias/).

## Jugar

Módulos ES sin build. Hay que servirlo por HTTP:

```bash
python3 -m http.server 8000
# http://localhost:8000            → juego
# http://localhost:8000/?god       → invulnerable (para probar)
# http://localhost:8000/sprites.html → hoja de sprites (nave en 9 frames de rolido + enemigos)
```

En iOS: abrir desde Safari en la misma red (`http://IP-de-tu-compu:8000`) y "Agregar a pantalla de inicio" para jugar a pantalla completa.
Si no suena, revisá el interruptor de silencio del iPhone (WebAudio lo respeta).

**Controles** — Táctil: arrastrar en cualquier lugar (movimiento relativo, el dedo no tapa la nave) · disparo automático · botón **ONDA** abajo a la derecha.
Teclado: flechas/WASD · Espacio = onda · P = pausa · M = sonido.

## Qué incluye (sección 15 de la biblia)

- **Nave** procedural que mezcla ambas referencias: cuerpo y vaina orgánica de la ref. 1, proa en doble púa y carne rosada de la ref. 2.
  Proporción ~1:1 (las referencias son ~1:2) y ~62×65 px lógicos: ≈16 % del ancho y ≈8 % del alto en un iPhone.
  9 frames de rolido pre-renderizados + núcleo brillante que marca la zona vulnerable (hitbox de 5 px).
- **Resolución lógica adaptable**: mínimo 390×690 → iPhone ≈390×844, iPad ≈480×690; respeta el notch/safe areas.
- **Enemigos**: Aguijón (enjambre rápido), Escarabajo (frente blindado, placas laterales que se desprenden y dejan expuesto el núcleo), Tábano (se detiene, brilla y suena antes de disparar; con el motor dañado se vuelve más lento).
- **Combate metal contra metal**: empujes según dónde pega el disparo, **choques entre enemigos** con daño, cadena y puntos extra, rebote contra las paredes y pausa de impacto (hit-stop).
- **Armas**: cañón doble automático, disparo de impacto (mejora), abanico (mejora), onda de choque (3 cargas, recarga cada 14 s; borra proyectiles).
- **Integridad** en 10 segmentos, invulnerabilidad breve tras cada golpe, 3 vidas, combo multiplicador.
- **Sonido sintetizado** por material (coraza aguda, placa, núcleo blando, choque grave, placa que cae con traqueteo) + pulso musical industrial.
- Guion de ~2:20 min: lectura → combinación → presión → descanso → enjambre final. Al despejarlo arranca el sector siguiente, más duro.

## Estructura

```
index.html      contenedor (viewport iOS, safe areas)
src/main.js     loop, guion de oleadas, IA, física de empujes/choques, HUD
src/art.js      arte procedural (placas, remaches, óxido, musgo, tejido) → sprites
src/audio.js    síntesis WebAudio de impactos metálicos y música
sprites.html    hoja de inspección de sprites
```
