import SpriteKit

extension GameScene {
    // MARK: - Nave del jugador

    func updateShip(_ dt: CGFloat) {
        guard let s = ship else { return }
        if !s.alive {
            respawnT -= dt
            if respawnT <= 0 && lives > 0 {
                let keep = s.charges
                let n = Ship(x: VW / 2, y: VH - safeBottom - 140)
                n.inv = 2.5
                n.charges = max(2, keep)
                ship = n
            }
            return
        }
        // teclado / mando: mueven el objetivo a velocidad constante
        let mv = inputAxis()
        if mv.dx != 0 || mv.dy != 0 {
            let n = max(1, hypot(mv.dx, mv.dy))
            s.tx = s.x + mv.dx / n * 380 * dt * 4
            s.ty = s.y + mv.dy / n * 380 * dt * 4
        }
        s.tx = clamp(s.tx, 22, VW - 22)
        s.ty = clamp(s.ty, safeTop + 90, VH - safeBottom - 34)
        // respuesta inmediata: el peso se expresa en la animación, no en inercia
        let f = 1 - exp(-30 * dt)
        s.px = s.x
        s.x += (s.tx - s.x) * f
        s.y += (s.ty - s.y) * f
        let vx = (s.x - s.px) / max(dt, 0.001)
        s.bank += (clamp(vx / 380, -1, 1) - s.bank) * (1 - exp(-10 * dt))
        s.inv = max(0, s.inv - dt)
        s.impactT = max(0, s.impactT - dt)
        s.wideT = max(0, s.wideT - dt)
        if s.charges < 3 {
            s.chargeT += dt
            if s.chargeT >= 14 { s.chargeT = 0; s.charges += 1 }
        }

        // cañón doble automático desde la proa
        s.fireT -= dt
        if s.fireT <= 0 {
            s.fireT = 0.09
            s.shotN += 1
            for m in ShipGeo.nose(s.bank) {
                addBullet(Bullet(x: s.x + m.x, y: s.y + m.y, vx: 0, vy: -950, slug: false))
            }
            if s.wideT > 0 && s.shotN % 2 == 0 {
                for (i, m) in ShipGeo.wings(s.bank).enumerated() {
                    let a: CGFloat = (i == 0 ? -1 : 1) * 0.14
                    addBullet(Bullet(x: s.x + m.x, y: s.y + m.y, vx: sin(a) * 900, vy: -cos(a) * 900, slug: false))
                }
            }
            Sound.shared.play("shot", gap: 0.07, volume: 0.35)
        }
        // disparo de impacto (mejora): lento y contundente, desplaza enemigos
        if s.impactT > 0 {
            s.slugT -= dt
            if s.slugT <= 0 {
                s.slugT = 0.42
                addBullet(Bullet(x: s.x, y: s.y - 30, vx: 0, vy: -640, slug: true))
                Sound.shared.play("slug", gap: 0.1, volume: 0.6)
            }
        }
        if chance(dt * 18) {
            let e = ShipGeo.engines(s.bank).randomElement() ?? .zero
            spawnParticle(.ember, x: s.x + e.x + rnd(-1.5, 1.5), y: s.y + e.y + 10, vx: rnd(-10, 10), vy: rnd(70, 140),
                          max: rnd(0.15, 0.35), size: rnd(1.4, 2.6))
        }
    }

    private func addBullet(_ b: Bullet) {
        b.node.zPosition = 12
        world.addChild(b.node)
        bullets.append(b)
    }

    func shockwave() {
        guard mode == .play, let s = ship, s.alive, s.charges > 0 else { return }
        s.charges -= 1
        Sound.shared.play("shock", gap: 0.1)
        shake = max(shake, 6)
        addRing(Ring(x: s.x, y: s.y, maxR: 175, dur: 0.38, color: SKColor(red: 0.75, green: 0.9, blue: 0.47, alpha: 1), wave: true, alpha: 0.85))
        s.inv = max(s.inv, 0.4)
    }

    func damageShip(_ d: CGFloat, at p: CGPoint) {
        guard let s = ship, s.alive, s.inv <= 0 else { return }
        s.integ -= d
        s.inv = 1.1
        shake = max(shake, 6)
        hitstop = max(hitstop, 0.06)
        Sound.shared.play("player_hit", gap: 0.1)
        sparks(p.x, p.y, 8, 260)
        if s.integ <= 0 {
            s.integ = 0
            s.alive = false
            lives -= 1
            respawnT = 1.6
            Sound.shared.play("explode_xl", gap: 0.1)
            shake = 12
            spawnParticle(.flash, x: s.x, y: s.y, vx: 0, vy: 0, max: 0.3, size: 110)
            sparks(s.x, s.y, 20, 380)
            debris(s.x, s.y, 9, vx: 0, vy: 0)
            addRing(Ring(x: s.x, y: s.y, maxR: 110, dur: 0.45, color: Palette.spark, alpha: 0.6))
            if lives <= 0 {
                mode = .over
                modeT = 0
                Sound.shared.stopMusic()
                if score > best {
                    best = score
                    UserDefaults.standard.set(best, forKey: "metalhive.best")
                }
                showScreen()
            }
        }
    }

    // MARK: - Enemigos

    @discardableResult
    func spawn(_ kind: Enemy.Kind, x: CGFloat, y: CGFloat, configure: (Enemy) -> Void = { _ in }) -> Enemy {
        let e = Enemy(kind: kind, x: x, y: y, hpMul: hpMul)
        if kind == .tabano { e.ty = VH * rnd(0.15, 0.3) }
        configure(e)
        e.node.position = P(x, y)
        world.addChild(e.node)
        enemies.append(e)
        return e
    }

    func updateEnemy(_ e: Enemy, _ dt: CGFloat) {
        e.t += dt
        e.flash = max(0, e.flash - dt)
        e.crashCD -= dt
        switch e.kind {
        case .stinger: aiStinger(e, dt)
        case .beetle: aiBeetle(e, dt)
        case .tabano: aiTabano(e, dt)
        }
        // los empujes nunca lanzan al enemigo con fuerza hacia la nave
        if e.ky > 70 { e.ky = 70 }
        e.x += (e.vx + e.kx) * dt
        e.y += (e.vy + e.ky) * dt
        let damp = exp(-e.drag * dt)
        e.kx *= damp; e.ky *= damp
        e.rot += e.rv * dt
        e.rv *= damp
        e.rot *= exp(-2.5 * dt)
        if hypot(e.kx, e.ky) < 50 { e.chain = 0 }
        if !e.entered && e.x > 0 && e.x < VW && e.y > 0 { e.entered = true }
        if e.entered {
            // rebote contra los límites del campo de juego
            if (e.x < e.r && e.kx < 0) || (e.x > VW - e.r && e.kx > 0) {
                if abs(e.kx) > 150 {
                    hitEnemy(e, abs(e.kx) / 70, kx: 0, ky: 0, hx: e.x, hy: e.y, kind: .crash)
                    sparks(e.x < e.r ? 2 : VW - 2, e.y, 6, 240)
                    Sound.shared.play("wall", gap: 0.08, volume: 0.7)
                    shake = max(shake, 3)
                }
                e.kx *= -0.5
            }
            if e.y > VH + 60 || e.y < -260 || e.x < -90 || e.x > VW + 90 { e.gone = true }
        }
        if e.kind != .stinger && e.hp < e.maxHp * 0.45 && chance(dt * 8) {
            spawnParticle(.smoke, x: e.x + rnd(-8, 8), y: e.y + rnd(-8, 8), vx: rnd(-8, 8), vy: rnd(-30, -10),
                          max: rnd(0.6, 1.0), size: rnd(9, 15))
        }
    }

    private func aiStinger(_ e: Enemy, _ dt: CGFloat) {
        var dx: CGFloat = 0, dy: CGFloat = 0
        if e.mode == .orbit {
            if let a = e.anchor, !a.dead {
                e.ang += dt * 1.8
                let tx = a.x + cos(e.ang) * e.orbitR, ty = a.y + sin(e.ang) * e.orbitR * 0.8
                dx = (tx - e.x) * 5; dy = (ty - e.y) * 5
            } else {
                e.mode = .dive; e.spd = 180; e.amp = 0; e.w = 0; e.ph = 0
            }
        }
        if e.mode == .dive {
            dy = e.spd
            dx = cos(e.t * e.w + e.ph) * e.amp * e.w
            if !e.locked && e.y > VH * 0.3 { e.locked = true; e.aimX = ship?.x ?? VW / 2 }
            if e.locked { dx += clamp((e.aimX - e.x) * 1.2, -110, 110) }
        } else if e.mode == .sweep {
            dx = e.dir * e.spd
            dy = 30 + e.t * 50
        }
        let s = min(1, 5 * dt)
        e.vx += (dx - e.vx) * s
        e.vy += (dy - e.vy) * s
    }

    private func aiBeetle(_ e: Enemy, _ dt: CGFloat) {
        let tx = ship.map { clamp(($0.x - e.x) * 0.25, -18, 18) } ?? 0
        e.vx += (tx - e.vx) * min(1, 2 * dt)
        e.vy += (36 - e.vy) * min(1, 2 * dt)
        if e.fires && e.entered && e.y < VH * 0.6 {
            e.fireT -= dt
            if e.fireT <= 0 { e.fireT = 3.2 / bspd; aimShot(e.x, e.y + 26, 170) }
        }
    }

    private func aiTabano(_ e: Enemy, _ dt: CGFloat) {
        let slow: CGFloat = e.hp < e.maxHp * 0.5 ? 0.55 : 1   // motor dañado: más lento, no errático
        e.stT += dt
        var dx: CGFloat = 0, dy: CGFloat = 0
        let hoverX = clamp(ship?.x ?? VW / 2, 40, VW - 40)
        switch e.st {
        case .enter:
            dy = (e.ty - e.y) * 3 * slow + 20
            if e.y >= e.ty - 4 { e.st = .hover; e.stT = 0 }
        case .hover:
            dx = clamp(hoverX - e.x, -1, 1) * 60 * slow
            dy = sin(e.t * 3) * 14 + (e.ty - e.y) * 2
            if e.stT > 0.9 { e.st = .charge; e.stT = 0; Sound.shared.play("telegraph", gap: 0.15, volume: 0.6) }
        case .charge:
            dy = (e.ty - e.y) * 2
            if e.stT > 0.75 {
                e.st = .cool; e.stT = 0; e.cycles += 1
                for a: CGFloat in [-0.2, 0, 0.2] {
                    aimShot(e.x - 11, e.y + 15, 210, spread: a)
                    aimShot(e.x + 11, e.y + 15, 210, spread: a)
                }
            }
        case .cool:
            dy = (e.ty - e.y) * 2
            if e.stT > 0.7 { e.st = e.cycles >= 3 ? .leave : .hover; e.stT = 0 }
        case .leave:
            dx = (e.x < VW / 2 ? -1 : 1) * 160 * slow
            dy = 120 * slow
        }
        let s = min(1, 4 * dt)
        e.vx += (dx - e.vx) * s
        e.vy += (dy - e.vy) * s
    }

    func aimShot(_ x: CGFloat, _ y: CGFloat, _ speed: CGFloat, spread: CGFloat = 0) {
        let tx = (ship?.alive ?? false) ? ship!.x : VW / 2
        let ty = (ship?.alive ?? false) ? ship!.y : VH
        let a = atan2(ty - y, tx - x) + spread
        let v = speed * bspd
        let b = EnemyBullet(x: x, y: y, vx: cos(a) * v, vy: sin(a) * v)
        b.node.zPosition = 16
        world.addChild(b.node)
        ebullets.append(b)
        Sound.shared.play("eshot", gap: 0.06, volume: 0.5)
    }

    // MARK: - Daño según el material que recibe el golpe

    enum HitKind { case bullet, slug, wave, crash }

    func hitEnemy(_ e: Enemy, _ dmgIn: CGFloat, kx kxIn: CGFloat, ky kyIn: CGFloat, hx: CGFloat, hy: CGFloat, kind: HitKind) {
        guard !e.dead else { return }
        var dmg = dmgIn, kx = kxIn, ky = kyIn
        if e.kind == .beetle && (kind == .bullet || kind == .slug) {
            let lx = hx - e.x
            let left = lx < 0
            if abs(lx) <= e.r * 0.42 {
                // coraza frontal: casi no le hace nada, suena agudo
                dmg *= 0.15
                Sound.shared.play("hit_armor", gap: 0.06, volume: 0.5)
                sparks(hx, hy + 4, 2, 200)
            } else if (left ? e.plateL : e.plateR) > 0 {
                if left { e.plateL -= dmg } else { e.plateR -= dmg }
                dmg *= 0.3
                Sound.shared.play("hit_plate", gap: 0.06, volume: 0.55)
                sparks(hx, hy, 2, 170)
                if (left ? e.plateL : e.plateR) <= 0 {
                    // la placa se desprende con peso y deja ese lado vulnerable
                    let s: CGFloat = left ? -1 : 1
                    Sound.shared.play("plate_off", gap: 0.05)
                    debris(e.x + s * 14, e.y - 4, 4, vx: s * 140, vy: -40)
                    sparks(e.x + s * 14, e.y, 8, 260)
                    addScore(150, at: CGPoint(x: e.x + s * 18, y: e.y), label: "PLACA")
                    shake = max(shake, 3)
                    e.rv += s * 3
                    e.refreshSprite()
                }
            } else {
                dmg *= 1.7
                Sound.shared.play("hit_flesh", gap: 0.06, volume: 0.6)
            }
        } else if kind == .bullet || kind == .slug {
            Sound.shared.play(e.kind == .stinger ? "hit_shell" : "hit_plate", gap: 0.045, volume: 0.45)
            if chance(0.5) { sparks(hx, hy, 1, 150) }
        }
        // el blindaje pesado absorbe el empuje del cañón liviano; solo el impacto lo desplaza
        if kind == .bullet && e.kind == .beetle { kx *= 0.25; ky *= 0.25 }
        e.hp -= dmg
        e.flash = 0.06
        e.kx += kx / e.mass
        e.ky += ky / e.mass
        e.rv += ((hx - e.x) / e.r) * (abs(kx) + abs(ky)) * -0.004 / e.mass
        if e.hp <= 0 { killEnemy(e, kind) }
    }

    func killEnemy(_ e: Enemy, _ kind: HitKind) {
        e.dead = true
        let big: CGFloat = e.kind == .beetle ? 2.2 : e.kind == .tabano ? 1.5 : 1
        Sound.shared.play(e.kind == .beetle ? "explode_l" : e.kind == .tabano ? "explode_m" : "explode_s", gap: 0.04)
        shake = max(shake, big >= 2 ? 4 : 1.5)
        spawnParticle(.flash, x: e.x, y: e.y, vx: 0, vy: 0, max: 0.16, size: e.r * 2.6)
        sparks(e.x, e.y, Int(4 * big), 280)
        debris(e.x, e.y, Int(3 * big), vx: e.kx * 0.6, vy: e.ky * 0.6)
        for _ in 0..<Int(2 * big) {
            spawnParticle(.smoke, x: e.x + rnd(-8, 8), y: e.y + rnd(-8, 8), vx: rnd(-20, 20), vy: rnd(-20, 10),
                          max: rnd(0.6, 1.0), size: rnd(12, 18) * big * 0.7)
        }
        combo += 1
        comboT = 1.3
        let mult = min(8, 1 + combo / 4)
        let crushed = kind == .crash
        addScore(e.score * mult * (crushed ? 2 : 1), at: CGPoint(x: e.x, y: e.y), label: crushed ? "APLASTADO" : nil)
        let p: CGFloat = e.kind == .beetle ? 0.35 : e.kind == .tabano ? 0.15 : 0.03
        if chance(p) {
            let pool: [PickupKind] = e.kind == .beetle ? [.impact, .impact, .repair, .charge] : PickupKind.allCases
            spawnPickup(pool.randomElement() ?? .repair, x: e.x, y: e.y)
        }
    }

    // MARK: - Choques entre enemigos (la mecánica distintiva)

    func enemyCollisions() {
        let E = enemies
        for i in 0..<E.count {
            let a = E[i]
            if a.dead { continue }
            for j in (i + 1)..<max(i + 1, E.count) {
                let b = E[j]
                if b.dead { continue }
                let dx = b.x - a.x, dy = b.y - a.y
                let rr = (a.r + b.r) * 0.88
                let d2 = dx * dx + dy * dy
                if d2 >= rr * rr { continue }
                let d = max(0.001, sqrt(d2)), nx = dx / d, ny = dy / d
                let rel = hypot(a.kx - b.kx, a.ky - b.ky)
                // separar según masas
                let push = (rr - d) / (a.mass + b.mass)
                a.x -= nx * push * b.mass; a.y -= ny * push * b.mass
                b.x += nx * push * a.mass; b.y += ny * push * a.mass
                guard rel > 120, a.crashCD <= 0, b.crashCD <= 0 else { continue }
                // intercambio de momento sobre la normal (choque semielástico)
                let va = a.kx * nx + a.ky * ny, vb = b.kx * nx + b.ky * ny
                let m1 = a.mass, m2 = b.mass, rest: CGFloat = 0.7
                let na = (m1 * va + m2 * vb - m2 * rest * (va - vb)) / (m1 + m2)
                let nb = (m1 * va + m2 * vb + m1 * rest * (va - vb)) / (m1 + m2)
                a.kx += (na - va) * nx; a.ky += (na - va) * ny
                b.kx += (nb - vb) * nx; b.ky += (nb - vb) * ny
                let chain = max(a.chain, b.chain) + 1
                a.chain = chain; b.chain = chain
                a.crashCD = 0.15; b.crashCD = 0.15
                let dmg = rel / 45
                let cx = a.x + nx * a.r, cy = a.y + ny * a.r
                sparks(cx, cy, 8, 320)
                Sound.shared.play("clang", gap: 0.05, volume: Float(min(1, rel / 300)))
                shake = max(shake, min(6, rel / 70))
                hitstop = max(hitstop, 0.045)
                addRing(Ring(x: cx, y: cy, maxR: 30, dur: 0.22, color: Palette.spark, alpha: 0.6))
                addScore(50 * chain, at: CGPoint(x: cx, y: cy - 10), label: chain > 1 ? "CHOQUE x\(chain)" : "CHOQUE")
                hitEnemy(a, dmg * (b.mass / 2), kx: 0, ky: 0, hx: cx, hy: cy, kind: .crash)
                hitEnemy(b, dmg * (a.mass / 2), kx: 0, ky: 0, hx: cx, hy: cy, kind: .crash)
            }
        }
    }

    // MARK: - Proyectiles, ondas, mejoras

    func updateBullets(_ dt: CGFloat) {
        for b in bullets {
            b.x += b.vx * dt
            b.y += b.vy * dt
            if b.y < -20 { b.dead = true; continue }
            for e in enemies where !e.dead && e.entered {
                let rr = e.r + b.r
                let dx = b.x - e.x, dy = b.y - e.y
                guard dx * dx + dy * dy < rr * rr else { continue }
                b.dead = true
                // empuje hacia arriba, y lateral si el golpe es descentrado
                let off = clamp((e.x - b.x) / e.r, -1, 1)
                let kx = off * b.knock * (b.slug ? 1.1 : 0.4)
                let ky = -b.knock * (b.slug ? 0.55 : 1)
                if b.slug {
                    addRing(Ring(x: b.x, y: b.y, maxR: 22, dur: 0.16, color: SKColor(red: 1, green: 0.67, blue: 0.31, alpha: 1), alpha: 0.6))
                    shake = max(shake, 2)
                }
                hitEnemy(e, b.dmg, kx: kx, ky: ky, hx: b.x, hy: b.y, kind: b.slug ? .slug : .bullet)
                break
            }
        }
    }

    func addRing(_ r: Ring) {
        r.node.zPosition = 15
        world.addChild(r.node)
        rings.append(r)
    }

    func updateRings(_ dt: CGFloat) {
        for r in rings {
            r.life += dt
            r.r = r.maxR * pow(min(1, r.life / r.dur), 0.6)
            guard r.wave else { continue }
            for e in enemies where !e.dead && !r.hit.contains(ObjectIdentifier(e)) {
                let d = hypot(e.x - r.x, e.y - r.y)
                guard d < r.r + e.r else { continue }
                r.hit.insert(ObjectIdentifier(e))
                let f = 560 * (1 - min(1, d / r.maxR) * 0.6)
                let nx = (e.x - r.x) / max(d, 0.001), ny = (e.y - r.y) / max(d, 0.001)
                hitEnemy(e, 3, kx: nx * f, ky: min(ny * f, 40), hx: e.x, hy: e.y, kind: .wave)
                e.chain = 1
            }
            for b in ebullets where !b.dead && hypot(b.x - r.x, b.y - r.y) < r.r {
                b.dead = true
                sparks(b.x, b.y, 2, 90)
            }
        }
        rings.removeAll { r in
            if r.life >= r.dur { r.node.removeFromParent(); return true }
            return false
        }
    }

    func updateEnemyBullets(_ dt: CGFloat) {
        for b in ebullets {
            b.t += dt
            b.x += b.vx * dt
            b.y += b.vy * dt
            if b.y > VH + 20 || b.y < -40 || b.x < -20 || b.x > VW + 20 { b.dead = true; continue }
            if let s = ship, s.alive, s.inv <= 0, hypot(b.x - s.x, b.y - (s.y + 3)) < Cfg.shipHitR + b.r {
                b.dead = true
                damageShip(12, at: CGPoint(x: b.x, y: b.y))
            }
        }
    }

    func bodyCollisions() {
        guard let s = ship, s.alive else { return }
        for e in enemies where !e.dead {
            let d = hypot(e.x - s.x, e.y - s.y)
            guard d < e.r + Cfg.shipBodyR else { continue }
            let nx = (e.x - s.x) / max(d, 0.001), ny = (e.y - s.y) / max(d, 0.001)
            if s.inv <= 0 { damageShip(e.kind == .beetle ? 34 : 22, at: CGPoint(x: (e.x + s.x) / 2, y: (e.y + s.y) / 2)) }
            e.kx = nx * 760 / e.mass
            e.ky = min(ny * 760 / e.mass, 0)
            hitEnemy(e, 3, kx: 0, ky: 0, hx: e.x, hy: e.y, kind: .crash)
        }
    }

    func spawnPickup(_ kind: PickupKind, x: CGFloat, y: CGFloat) {
        let p = Pickup(kind: kind, x: x, y: y)
        p.node.zPosition = 8
        world.addChild(p.node)
        pickups.append(p)
    }

    func updatePickups(_ dt: CGFloat) {
        for p in pickups {
            p.t += dt
            p.y += 70 * dt
            p.x += sin(p.t * 2) * 20 * dt
            if p.y > VH + 30 { p.dead = true; continue }
            guard let s = ship, s.alive, hypot(p.x - s.x, p.y - s.y) < 30 else { continue }
            p.dead = true
            Sound.shared.play("pickup", gap: 0.1, volume: 0.7)
            switch p.kind {
            case .impact: s.impactT = 10
            case .wide: s.wideT = 12
            case .repair: s.integ = min(100, s.integ + 35)
            case .charge: s.charges = min(3, s.charges + 1)
            }
            floatText(p.kind.label, x: s.x, y: s.y - 40, color: Palette.pickup(p.kind), big: true)
            addRing(Ring(x: s.x, y: s.y, maxR: 44, dur: 0.3, color: Palette.pickup(p.kind), alpha: 0.6))
        }
    }
}
