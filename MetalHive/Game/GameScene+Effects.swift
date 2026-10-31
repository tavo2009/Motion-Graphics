import SpriteKit

/// Efectos sobrios al estilo arcade clásico: pocos elementos, cortos y legibles.
extension GameScene {
    private static let maxParticles = 220

    func spawnParticle(_ kind: Particle.Kind, x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat, max: CGFloat, size: CGFloat) {
        guard parts.count < GameScene.maxParticles else { return }
        let node: SKSpriteNode
        switch kind {
        case .spark:
            node = SKSpriteNode(texture: Tex.get("spark"), size: CGSize(width: 2, height: size))
            node.color = Palette.spark
            node.colorBlendFactor = 1
            node.blendMode = .add
            node.zRotation = -atan2(vx, -vy)
        case .debris:
            node = SKSpriteNode(texture: Tex.get("debris\(Int.random(in: 0...3))"), size: CGSize(width: size, height: size))
        case .smoke:
            node = SKSpriteNode(texture: Tex.get("smoke"), size: CGSize(width: size, height: size))
        case .flash:
            node = SKSpriteNode(texture: Tex.get("flash"), size: CGSize(width: size, height: size))
            node.blendMode = .add
        case .ember:
            node = SKSpriteNode(texture: Tex.get("dot"), size: CGSize(width: size, height: size))
            node.color = SKColor(red: 1, green: 0.69, blue: 0.29, alpha: 1)
            node.colorBlendFactor = 1
            node.blendMode = .add
        }
        node.zPosition = kind == .smoke || kind == .debris ? 13 : 15
        node.position = P(x, y)
        world.addChild(node)
        let p = Particle(kind, x: x, y: y, vx: vx, vy: vy, max: max, size: size, node: node)
        if kind == .debris { p.rot = rnd(0, TAU); p.vr = rnd(-9, 9) }
        parts.append(p)
    }

    func sparks(_ x: CGFloat, _ y: CGFloat, _ n: Int, _ speed: CGFloat) {
        for _ in 0..<n {
            let a = rnd(0, TAU), v = rnd(0.3, 1) * speed
            spawnParticle(.spark, x: x, y: y, vx: cos(a) * v, vy: sin(a) * v, max: rnd(0.1, 0.28), size: rnd(5, 9))
        }
    }

    func debris(_ x: CGFloat, _ y: CGFloat, _ n: Int, vx: CGFloat, vy: CGFloat) {
        for _ in 0..<n {
            let a = rnd(0, TAU), v = rnd(40, 180)
            spawnParticle(.debris, x: x, y: y, vx: vx + cos(a) * v, vy: vy + sin(a) * v, max: rnd(0.6, 1.1), size: rnd(5, 9))
        }
    }

    func updateParticles(_ dt: CGFloat) {
        for p in parts {
            p.life += dt
            p.x += p.vx * dt
            p.y += p.vy * dt
            let k = max(0, 1 - p.life / p.max)
            switch p.kind {
            case .debris:
                p.rot += p.vr * dt
                p.vx *= 0.97
                p.vy = p.vy * 0.97 + 50 * dt
                p.node.zRotation = -p.rot
                p.node.alpha = min(1, k * 2)
            case .spark:
                p.vx *= 0.9; p.vy *= 0.9
                p.node.alpha = k
            case .smoke:
                p.vy += 30 * dt
                p.node.alpha = 0.55 * k
                p.node.setScale(1.6 - k * 0.6)
            case .flash:
                p.node.alpha = k
            case .ember:
                p.node.alpha = k
            }
        }
        parts.removeAll { p in
            if p.life >= p.max { p.node.removeFromParent(); return true }
            return false
        }
        for x in texts {
            x.life += dt
            x.y -= 26 * dt
            x.label.alpha = min(1, (1 - x.life / x.max) * 2.5)
        }
        texts.removeAll { x in
            if x.life >= x.max { x.label.removeFromParent(); return true }
            return false
        }
        shake *= exp(-10 * dt)
    }

    /// Solo los eventos especiales muestran texto (choques, placas, mejoras): la pantalla queda limpia.
    func addScore(_ n: Int, at p: CGPoint, label: String?) {
        score += n
        if let label { floatText("\(label) +\(n)", x: p.x, y: p.y, color: Palette.gold, big: true) }
    }

    func floatText(_ s: String, x: CGFloat, y: CGFloat, color: SKColor, big: Bool) {
        let l = SKLabelNode(fontNamed: Fonts.main)
        l.text = s
        l.fontSize = big ? 13 : 10
        l.fontColor = color
        l.verticalAlignmentMode = .center
        l.horizontalAlignmentMode = .center
        l.zPosition = 17
        world.addChild(l)
        texts.append(FloatText(label: l, x: clamp(x, 50, VW - 50), y: y, max: 1.0))
    }
}
