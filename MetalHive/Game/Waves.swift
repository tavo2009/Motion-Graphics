import SpriteKit

/// Guion del sector: lectura → combinación → presión → descanso → encuentro.
/// Al despejarlo, el siguiente sector repite con enemigos más resistentes y balas más rápidas.
extension GameScene {
    typealias Event = (CGFloat, @MainActor (GameScene) -> Void)

    @MainActor static let script: [Event] = [
        (0.3, { s in s.banner(s.loop == 0 ? "SECTOR 1" : "SECTOR \(s.loop + 1)", s.loop == 0 ? "desierto de la colmena" : "la colmena se endurece") }),
        (2.5, { s in s.vee(5) }),
        (7, { s in s.sweep(5, dir: 1, y0: 0.08) }),
        (10.5, { s in s.sweep(5, dir: -1, y0: 0.14) }),
        (15, { s in _ = s.beetle(0.5) }),
        (22, { s in s.snake(4, x0: 0.22); s.snake(4, x0: 0.78) }),
        (27, { s in s.pickup(.impact, 0.5) }),
        (30, { s in s.beetle(0.36); s.beetle(0.64) }),
        (37, { s in s.orbit(s.beetle(0.5), 5) }),
        (44, { s in s.vee(5, cx: 0.3); s.vee(5, cx: 0.7) }),
        (50, { s in s.banner("TÁBANO", "esquivá cuando brilla") }),
        (52, { s in s.tabano(0.3) }),
        (55, { s in s.tabano(0.7) }),
        (60, { s in s.vee(7, speed: 190) }),
        (64, { s in s.beetle(0.22); s.beetle(0.5, fires: true); s.beetle(0.78) }),
        (70, { s in s.pickup(.wide, 0.3) }),
        (73, { s in s.tabano(0.25); s.tabano(0.75); s.sweep(6, dir: 1, y0: 0.12) }),
        (82, { s in s.pickup(.repair, 0.6) }),
        (84, { s in s.orbit(s.beetle(0.32), 4); s.orbit(s.beetle(0.68), 4) }),
        (90, { s in s.tabano(0.5) }),
        (97, { s in s.sweep(6, dir: 1, y0: 0.06); s.sweep(6, dir: -1, y0: 0.16) }),
        (103, { s in s.tabano(0.2); s.tabano(0.5); s.tabano(0.8) }),
        (110, { s in s.beetle(0.4); s.beetle(0.6); s.pickup(.charge, 0.5); s.pickup(.impact, 0.2) }),
        (116, { s in s.snake(5, x0: 0.15, amp: 40); s.snake(5, x0: 0.85, amp: 40) }),
        (122, { s in s.banner("ENJAMBRE", "") }),
        (124, { s in
            s.beetle(0.2, fires: true); s.beetle(0.42); s.beetle(0.58); s.beetle(0.8, fires: true)
            s.tabano(0.35, ty: 0.12); s.tabano(0.65, ty: 0.12)
        }),
        (130, { s in s.vee(7) }),
        (136, { s in s.waitClear = true }),
    ]

    func runScript(_ dt: CGFloat) {
        if waitClear {
            guard enemies.isEmpty else { return }
            waitClear = false
            let bonus = 5000 * (loop + 1)
            banner("SECTOR DESPEJADO", "+\(bonus) pts")
            score += bonus
            loop += 1
            hpMul *= 1.22
            bspd *= 1.1
            stageT = -3
            scriptIndex = 0
            return
        }
        stageT += dt
        while scriptIndex < GameScene.script.count && GameScene.script[scriptIndex].0 <= stageT {
            let ev = GameScene.script[scriptIndex]
            scriptIndex += 1
            ev.1(self)
        }
    }

    // MARK: - Formaciones

    func vee(_ n: Int, cx: CGFloat = 0.5, speed: CGFloat = 170) {
        for i in 0..<n {
            let o = CGFloat(i) - CGFloat(n - 1) / 2
            spawn(.stinger, x: VW * cx + o * 34, y: -30 - abs(o) * 28) { e in e.mode = .dive; e.spd = speed }
        }
    }

    func snake(_ n: Int, x0: CGFloat, amp: CGFloat = 50) {
        for i in 0..<n {
            spawn(.stinger, x: VW * x0, y: -30 - CGFloat(i) * 36) { e in
                e.mode = .dive; e.spd = 150; e.amp = amp; e.w = 2.4; e.ph = -CGFloat(i) * 0.6
            }
        }
    }

    func sweep(_ n: Int, dir: CGFloat, y0: CGFloat) {
        for i in 0..<n {
            let x = dir > 0 ? -20 - CGFloat(i) * 34 : VW + 20 + CGFloat(i) * 34
            spawn(.stinger, x: x, y: VH * y0 + CGFloat(i) * 6) { e in e.mode = .sweep; e.dir = dir; e.spd = 190 }
        }
    }

    @discardableResult
    func beetle(_ x: CGFloat, fires: Bool = false) -> Enemy {
        spawn(.beetle, x: VW * x, y: -40) { e in e.fires = fires }
    }

    func tabano(_ x: CGFloat, ty: CGFloat? = nil) {
        spawn(.tabano, x: VW * x, y: -30) { e in
            if let ty { e.ty = self.VH * ty }
        }
    }

    func orbit(_ anchor: Enemy, _ n: Int) {
        for i in 0..<n {
            spawn(.stinger, x: anchor.x, y: anchor.y - 50 - CGFloat(i) * 10) { e in
                e.mode = .orbit; e.anchor = anchor; e.ang = CGFloat(i) / CGFloat(n) * TAU; e.orbitR = 46
            }
        }
    }

    func pickup(_ kind: PickupKind, _ x: CGFloat) {
        spawnPickup(kind, x: VW * x, y: -20)
    }
}
