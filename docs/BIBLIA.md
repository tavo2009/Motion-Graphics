Gus, acá hay una idea con mucha personalidad: **un juego de naves donde combatir se sienta como atravesar una tormenta de metal vivo**. La referencia arcade está, pero la identidad propia puede surgir de esa mezcla que aparece en tus imágenes: máquinas industriales envejecidas, insectos y materia orgánica fusionados.  
Primero, un dato que comprobé: *Vulgus* era japonés, sí, pero de **Capcom**, no de Konami. La propia compañía lo sitúa en mayo de 1984 y lo presenta como su primer videojuego arcade.   
Te propongo esta primera biblia como **base creativa abierta**. Todavía no estamos diseñando escenarios ni cerrando todos los números: estamos definiendo qué se hace, qué se siente y qué hará que una partida sea distinta de la anterior.  
## Biblia inicial de concepto y jugabilidad  
# Título provisional:   
## METALHIVE  
*Metal* por el material, los impactos y el peso; *hive* por la colmena y los enemigos con comportamiento de insecto. Es un nombre de trabajo: habría que comprobar su disponibilidad antes de adoptarlo.  
**Concepto en una frase:**  
Un juego arcade de desplazamiento vertical en el que una nave biomecánica se abre paso entre enjambres de criaturas metálicas, utilizando sus armas y el propio movimiento de los enemigos para sobrevivir.  
**La sensación que buscamos**  
La nave avanza constantemente. Aparece un grupo de enemigos. Disparás, y sus corazas responden con chispas y golpes metálicos. Uno pierde el equilibrio, golpea a otro y ambos se desvían. Aprovechás ese pequeño caos para atravesar el hueco que se abrió.  
La acción debería sentirse:  
* **Física:** cada impacto tiene peso y una reacción reconocible.  
* **Ágil:** la nave responde rápido, incluso si visualmente parece pesada.  
* **Intensa, pero legible:** hay peligro y espectáculo, pero podés entender qué te golpeó.  
* **Variada:** cada enemigo altera la situación de una manera diferente.  
* **Justa:** perder te da ganas de volver a intentarlo, porque entendés qué pasó.  
## 1. La nave protagonista  
Tus dos imágenes proponen algo atractivo: la nave no parece recién salida de una fábrica futurista. Tiene **placas remachadas, tuberías, metal oxidado, motores y partes orgánicas**. Da la sensación de que fue construida, reparada y transformada muchas veces.  
Yo conservaría esa identidad y haría algunos ajustes para favorecer la jugabilidad:  
* Una **silueta clara y reconocible desde arriba**, incluso en una pantalla de móvil.  
* Un centro visual bien marcado para saber dónde está la zona vulnerable.  
* Motores y armas fáciles de identificar.  
* Detalles orgánicos presentes, aunque sin tanta complejidad que se pierdan durante el movimiento.  
* Inclinaciones laterales como las de tus imágenes para expresar los desplazamientos.  
La primera referencia tiene una presencia más robusta y orgánica; la segunda, una forma más afilada y claramente aeronáutica. **Mi propuesta sería combinar ambas:** conservar el cuerpo contundente de la primera y tomar de la segunda una silueta frontal más limpia.  
La gran pregunta creativa que podemos dejar abierta es si esa materia orgánica es una aliada de la nave, una tecnología cultivada o algo que la está invadiendo. No hace falta resolverlo todavía para empezar a jugar.  
## 2. Estructura básica de la partida  
**Vista:** cenital, mirando desde arriba.  
**Desplazamiento:** vertical y automático. El mundo avanza hacia abajo y la nave parece progresar hacia arriba.  
**Movimiento:** la nave puede desplazarse en todas las direcciones dentro del área de juego, con límites que mantengan visible la acción.  
**Objetivo inmediato:** sobrevivir, destruir enemigos, recoger mejoras y superar encuentros cada vez más complejos.  
**Objetivo de una fase:** llegar al final de un recorrido y derrotar a un enemigo principal.  
Un ciclo de juego podría ser:  
1. Identificás una formación enemiga.  
2. Elegís dónde colocarte y a qué enemigo atacar primero.  
3. Esquivás proyectiles y cuerpos.  
4. Provocás una reacción en la formación.  
5. Recogés una mejora o una carga especial.  
6. Llegás a un encuentro distinto que pone a prueba lo aprendido.  
La intención es que no se trate solo de mantener el disparo y esperar a que todo explote: **la posición y el orden de los ataques tienen que importar**.  
## 3. Los controles  
Como ya estás trabajando en juegos para móviles, te propongo empezar con esa plataforma como **supuesto de diseño**, sin descartar otras.  
**En móvil**  
* **Mover:** arrastrar el dedo por la pantalla; la nave sigue el movimiento con precisión.  
* **Disparo principal:** automático mientras la nave está activa.  
* **Arma especial:** botón grande y accesible en una esquina.  
* **Pausa:** botón separado de la acción principal.  
El dedo no debería tapar la nave: podemos probar un pequeño desplazamiento entre el punto que tocás y la posición de la nave, ajustable en opciones.  
**En ordenador o con mando**  
* Movimiento con teclas, joystick o cruceta.  
* Disparo principal configurable entre automático y manual.  
* Un botón para el arma especial.  
**Principio fundamental:** la nave tiene que obedecer al instante. El peso debe sentirse en la animación y en el sonido, sin introducir una inercia que vuelva frustrante esquivar.  
## 4. El combate: metal contra metal  
Este es el corazón del proyecto. El enemigo no desaparece simplemente porque una barra llegó a cero: **reacciona a los impactos**.  
**Propuesta de reacción**  

| Situación | Respuesta del enemigo |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Recibe un disparo débil | Chispa, pequeño retroceso y sonido metálico breve. |
| Recibe varios impactos seguidos | La coraza vibra, aparecen marcas y cambia el sonido. |
| Pierde una pieza | Se desprende una placa o un componente; su comportamiento puede cambiar. |
| Es alcanzado por un impacto fuerte | Se desplaza de forma visible y puede golpear a otro enemigo. |
| Queda destruido | Su estructura se rompe en piezas con peso y una explosión acorde a su tamaño. |
  
No todos los enemigos necesitan simular física compleja. Para una primera versión, podemos usar **reacciones controladas y predecibles**: que el jugador entienda la relación entre el golpe y el movimiento resultante.  
**Colisiones entre enemigos**  
Esta puede ser nuestra mecánica distintiva.  
Cuando un enemigo recibe un golpe potente, se desplaza durante un instante. Si choca con otro:  
* Ambos reciben daño.  
* Pueden cambiar de trayectoria.  
* El choque produce un sonido contundente.  
* Se puede abrir un hueco en la formación.  
* Si el segundo enemigo también es desplazado, puede producirse una pequeña reacción en cadena.  
**Ejemplo:** disparás a un insecto blindado desde un lado; este se desplaza, golpea a otro y desarma la formación. Tenés un segundo para pasar por el espacio que quedó libre.  
Para que sea justo, los enemigos no deberían salir despedidos de manera imprevisible hacia la nave. Sus desplazamientos necesitan ser **cortos, visibles y legibles**.  
## 5. Armas de la nave  
La idea inicial es tener pocas armas con funciones bien diferenciadas. Así cada una cambia la forma de jugar.  
**A. Cañón principal**  
Disparo rápido y frontal. Es el arma que siempre está disponible.  
* Sirve para enemigos pequeños.  
* Puede desgastar placas de enemigos blindados.  
* Su impacto se siente mediante sonido, chispas y pequeñas vibraciones.  
**B. Disparo de impacto**  
Un proyectil más lento y contundente.  
* Hace más daño por golpe.  
* Desplaza enemigos.  
* Es especialmente útil para provocar colisiones.  
* A cambio, deja menos margen si fallás.  
**Propuesta para móvil:** se activa temporalmente al recoger una mejora, evitando agregar otro botón desde el comienzo.  
**C. Arma especial: onda de choque**  
Una descarga alrededor o delante de la nave.  
* Empuja a los enemigos cercanos.  
* Puede destruir proyectiles sencillos.  
* Produce daño moderado.  
* Puede desencadenar choques entre enemigos.  
* Tiene cargas limitadas que se recuperan durante la partida.  
Me gusta más esta opción que una bomba que simplemente elimina todo: conserva ese momento épico, pero además **usa el metal y las colisiones como parte de la jugabilidad**.  
## 6. Los enemigos: insectos que también son máquinas  
No serían naves genéricas con forma de insecto pegada encima. La idea es que cada uno combine una **lógica mecánica** con una **conducta reconocible**: agruparse, perseguir, protegerse o lanzarse contra la nave.  
**Primeras familias**  

| Enemigo provisional | Comportamiento | Cómo se combate |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Aguijón | Pequeño y rápido. Entra en grupos y cambia de dirección. | Disparo principal; es frágil, pero peligroso en grupo. |
| Escarabajo | Avanza despacio con una coraza frontal resistente. | Disparar a sus costados o desplazarlo contra otros. |
| Tábano | Se aproxima, apunta y dispara antes de retirarse. | Identificar su aviso y moverse antes del disparo. |
| Pinza | Intenta acercarse lateralmente y cerrar el espacio. | Anticipar la trayectoria y escapar por el hueco. |
| Portador | Enemigo grande que transporta pequeñas unidades. | Elegir entre destruirlo rápido o controlar las unidades que libera. |
| Recolector | Recoge piezas metálicas cercanas y refuerza a otros. | Priorizarlo antes de que el grupo se vuelva más resistente. |
  
La variedad vendría de **cómo se combinan**, no solo de agregar enemigos nuevos. Un escarabajo por sí solo es sencillo; dos escarabajos protegiendo a un portador crean una situación diferente.  
**Un detalle que puede darles vida**  
Cuando pierden ciertas piezas, algunos enemigos cambian de comportamiento:  
* Un escarabajo sin una placa lateral queda más vulnerable de ese lado.  
* Un tábano con un motor dañado se mueve de forma más lenta, pero no errática.  
* Un portador dañado deja de producir unidades y trata de escapar.  
Así, el combate tiene pequeñas transformaciones visibles sin necesitar decenas de mecánicas nuevas.  
## 7. Daño, vidas y dificultad  
Acá me separaría de la dureza extrema que recordás de los arcade.  
**Propuesta inicial**  
* La nave tiene una **barra de integridad** que permite recibir varios golpes.  
* Los proyectiles normales causan daño moderado.  
* Los enemigos grandes y las colisiones fuertes causan más daño.  
* Después de recibir un impacto, hay una breve protección visualmente clara para evitar perder toda la vida de golpe.  
* Al perder una vida, la partida continúa desde una posición segura dentro del recorrido.  
* Puede haber puntos de control antes de encuentros importantes.  
Los números exactos se deciden probando; lo importante ahora es la regla: **un error duele, pero no tiene por qué arruinar toda la partida**.  
**Tres dificultades posibles**  
* **Exploración:** más margen de reacción y mayor resistencia.  
* **Arcade:** equilibrio pensado como experiencia principal.  
* **Veterano:** enemigos más exigentes y menos margen de error.  
Mi recomendación es que la dificultad crezca por **combinaciones más interesantes**, no solamente por llenar la pantalla de proyectiles.  
## 8. Cómo evitar que se vuelva repetitivo  
Esta es una decisión de diseño central. Una fase no debería mantener la misma intensidad ni repetir siempre la misma formación.  
Podemos alternar momentos como estos:  
1. **Lectura:** aparece un enemigo nuevo y entendés qué hace.  
2. **Combinación:** ese enemigo se mezcla con otros.  
3. **Presión:** la formación ocupa más espacio y exige moverte.  
4. **Descanso breve:** recogés mejoras y recuperás orientación.  
5. **Encuentro especial:** un enemigo grande introduce una situación distinta.  
También podemos variar los objetivos de algunos tramos sin abandonar la esencia de disparar y esquivar:  
* Destruir un portador antes de que abandone la pantalla.  
* Sobrevivir a una formación que intenta rodearte.  
* Abrir una ruta entre enemigos blindados.  
* Elegir entre perseguir una mejora o mantener una posición segura.  
No hace falta que cada minuto aparezca un sistema nuevo. La variedad debería surgir de **situaciones distintas creadas con reglas que ya aprendiste**.  
## 9. Jefes: máquinas que se desarman  
Los jefes pueden ser grandes insectos mecánicos compuestos por partes identificables.  
## Ejemplo conceptual:   
**El Acorazado**  
Una criatura enorme con coraza, dos extremidades laterales y un núcleo central.  
* Al principio, sus placas protegen el núcleo.  
* Una extremidad lanza proyectiles y la otra intenta bloquear el movimiento.  
* Cuando destruís una extremidad, cambia su patrón.  
* Algunas placas se desprenden con golpes y sonido pesado.  
* En una fase posterior, el núcleo queda expuesto durante intervalos.  
Lo interesante es que el jefe no tenga simplemente una barra de vida enorme: **su aspecto y su manera de atacar cambian a medida que lo desmontás**.  
Los ataques peligrosos deben tener una preparación visible y audible. Si perdés, tenés que poder pensar: «Vi que estaba cargando ese ataque; la próxima me muevo antes».  
## 10. Sonido: una parte protagonista  
Acá hay una oportunidad enorme, Gus, porque lo que recordás de *Vulgus* no es solo la imagen: es la **sensación sonora del golpe**.  
Yo propondría construir una biblioteca de sonidos basada en materiales y tamaños:  
* **Placas finas:** golpes secos, agudos y breves.  
* **Corazas grandes:** impactos más graves, con resonancia.  
* **Piezas sueltas:** traqueteos y pequeños rebotes.  
* **Motores dañados:** vibración mecánica irregular.  
* **Colisión entre enemigos:** golpe metálico con una cola corta y potente.  
* **Destrucción de jefe:** rotura por capas, seguida de una explosión mayor.  
También habría diferencias entre golpear una coraza sana, una dañada y una pieza expuesta. Eso le permitiría al jugador **escuchar el estado del enemigo**, además de verlo.  
Para que no canse, usaríamos variaciones de cada sonido, límites para que no se acumulen demasiados golpes iguales y momentos donde la música y los efectos tengan espacio para respirar.  
## 11. Música y tono  
La música podría mezclar:  
* Energía arcade.  
* Electrónica con ritmo marcado.  
* Percusión industrial.  
* Texturas mecánicas y orgánicas.  
No imagino una banda sonora permanentemente estridente. Sería más eficaz que crezca en los encuentros importantes y deje espacio a los sonidos metálicos durante el combate.  
El tono visual y sonoro sería **oscuro e intenso, pero no necesariamente terrorífico**. Más fascinación por esta tecnología viva que horror explícito.  
## 12. Dirección visual inicial  
Tomando tus referencias, propondría esta combinación:  
* **Materiales:** acero envejecido, remaches, cables, tubos y placas reparadas.  
* **Capa orgánica:** tejidos, membranas o estructuras que parecen haber crecido entre las piezas.  
* **Colores base:** hierro oscuro, óxido, verde oliva y tonos orgánicos apagados.  
* **Acentos de acción:** fuego de motores, chispas y proyectiles con colores más vivos.  
* **Lectura:** enemigos, proyectiles y mejoras diferenciados claramente por silueta y color.  
Hay un detalle importante: las naves de referencia son muy ricas en textura. Eso funciona para una imagen grande, pero durante la partida habrá que **simplificar algunos detalles y reforzar la silueta**, sobre todo en móvil. La idea es conservar el carácter sin perder claridad.  
## 13. Puntuación y mejoras  
Para mantener el espíritu arcade, propongo que haya puntuación, pero que el jugador no necesite dominarla para disfrutar.  
**Puntuación**  
Se obtienen puntos por:  
* Destruir enemigos.  
* Desarmar formaciones completas.  
* Provocar colisiones entre enemigos.  
* Encadenar destrucciones en un intervalo corto.  
* Superar un encuentro recibiendo poco daño.  
**Mejoras durante la partida**  
Las mejoras podrían ser temporales o durar hasta perder una vida:  
* Disparo más ancho.  
* Mayor potencia de impacto.  
* Una carga adicional de onda de choque.  
* Recuperación parcial de integridad.  
La clave es que ninguna mejora haga ilegible la pantalla ni convierta el juego en una sucesión de explosiones automáticas.  
## 14. El primer minuto de juego  
Para imaginar cómo se sentiría, te propongo este arranque:  
**0:00–0:15.** La nave entra en pantalla. Aparecen unos pocos Aguijones que avanzan en una formación sencilla. El jugador aprende a moverse y disparar.  
**0:15–0:30.** Entra un Escarabajo. Los disparos golpean su coraza con un sonido distinto. Se entiende que es más resistente.  
**0:30–0:45.** Aparece una mejora de impacto. Un golpe desplaza al Escarabajo contra otro enemigo: se produce el primer choque metálico contundente.  
**0:45–1:00.** Aparecen Aguijones alrededor del Escarabajo. El jugador decide si despejar primero los pequeños o usar al blindado para romper la formación.  
En menos de un minuto ya se presenta la propuesta: **disparar, esquivar, escuchar el metal y aprovechar las colisiones**.  
## 15. Primera versión para probar  
Antes de diseñar una campaña completa, haría un prototipo pequeño con:  
* Una nave jugable.  
* Desplazamiento vertical.  
* Disparo principal.  
* Onda de choque.  
* Tres enemigos: Aguijón, Escarabajo y Tábano.  
* Choques entre enemigos.  
* Integridad de la nave.  
* Una secuencia de unos dos o tres minutos.  
* Una primera prueba de sonido metálico.  
Ese prototipo debería responder una pregunta concreta:  
**¿Es divertido mover la nave, golpear enemigos y provocar choques incluso antes de añadir escenarios complejos y muchos sistemas?**  
Si la respuesta es sí, ya tenemos una base sólida para expandir el juego.  
## La identidad que me gustaría conservar  
Para mí, la idea más potente que apareció de lo que contaste es esta: **no estamos peleando contra dibujos de insectos en el espacio; estamos atravesando una colmena de máquinas que tienen cuerpo, peso y comportamiento propio**.  
Ahí está el homenaje arcade, pero también una identidad que puede ser muy tuya: visualmente entre lo industrial y lo orgánico, con un sonido casi táctil y encuentros que cambian según cómo golpeás a cada enemigo.  
