import SpriteKit

/// Táctil (iPhone/iPad), mouse y teclado (Mac), mando y teclado físico (todas las plataformas).
extension GameScene {
    /// Punto de la vista → coordenadas de juego.
    func toGame(_ p: CGPoint) -> CGPoint {
        CGPoint(x: (p.x - world.position.x) / SC, y: VH - p.y / SC)
    }

    private func inside(_ b: (CGPoint, CGFloat), _ p: CGPoint) -> Bool {
        hypot(p.x - b.0.x, p.y - b.0.y) < b.1
    }

    func pointerDown(_ id: AnyHashable, at viewPoint: CGPoint) {
        let p = toGame(viewPoint)
        switch mode {
        case .title:
            startGame()
            return
        case .over:
            if modeT > 1 { startGame() }
            return
        case .paused:
            if inside(muteButton, p) { toggleMute() } else { togglePause() }
            return
        case .play:
            break
        }
        if inside(muteButton, p) { toggleMute(); return }
        if inside(pauseButton, p) { togglePause(); return }
        if inside(shockButton, p) { shockwave(); return }
        if dragID == nil {
            dragID = id
            dragLast = p
        }
    }

    /// Movimiento relativo: la nave sigue el desplazamiento del dedo, así el dedo nunca la tapa.
    func pointerMoved(_ id: AnyHashable, at viewPoint: CGPoint) {
        guard id == dragID, let s = ship else { return }
        let p = toGame(viewPoint)
        s.tx = clamp(s.tx + (p.x - dragLast.x) * dragSensitivity, 22, VW - 22)
        s.ty = clamp(s.ty + (p.y - dragLast.y) * dragSensitivity, safeTop + 90, VH - safeBottom - 34)
        dragLast = p
    }

    func pointerUp(_ id: AnyHashable) {
        if id == dragID { dragID = nil }
    }

    #if os(iOS)
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches { pointerDown(ObjectIdentifier(t), at: t.location(in: self)) }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches { pointerMoved(ObjectIdentifier(t), at: t.location(in: self)) }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches { pointerUp(ObjectIdentifier(t)) }
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches { pointerUp(ObjectIdentifier(t)) }
    }
    #else
    override func mouseDown(with event: NSEvent) { pointerDown("mouse", at: event.location(in: self)) }
    override func mouseDragged(with event: NSEvent) { pointerMoved("mouse", at: event.location(in: self)) }
    override func mouseUp(with event: NSEvent) { pointerUp("mouse") }

    /// Teclas del Mac (códigos virtuales de AppKit), llegan desde GameSKView.
    func key(_ code: UInt16, down: Bool, isRepeat: Bool) {
        if down { keysHeld.insert(code) } else { keysHeld.remove(code) }
        guard down, !isRepeat else { return }
        switch code {
        case 49, 7, 36:            // espacio, X, return
            if mode == .title || (mode == .over && modeT > 1) { startGame() }
            else if code != 36 { shockwave() }
        case 35, 53:               // P, escape
            togglePause()
        case 46:                   // M
            toggleMute()
        default:
            break
        }
    }
    #endif

    /// Eje de movimiento combinado (teclado del Mac + mando + teclado físico del iPad).
    func inputAxis() -> CGVector {
        var x: CGFloat = 0, y: CGFloat = 0
        #if os(macOS)
        if keysHeld.contains(123) || keysHeld.contains(0) { x -= 1 }    // ← A
        if keysHeld.contains(124) || keysHeld.contains(2) { x += 1 }    // → D
        if keysHeld.contains(126) || keysHeld.contains(13) { y -= 1 }   // ↑ W
        if keysHeld.contains(125) || keysHeld.contains(1) { y += 1 }    // ↓ S
        #endif
        if x == 0 && y == 0 { return padMove }
        return CGVector(dx: x, dy: y)
    }

    func handlePad() {
        let f = pad.poll()
        padMove = f.move
        if f.start && (mode == .title || (mode == .over && modeT > 1)) { startGame(); return }
        if f.pause && (mode == .play || mode == .paused) { togglePause() }
        if f.mute { toggleMute() }
        if f.shock && mode == .play { shockwave() }
    }
}
