import SwiftUI
import SpriteKit

@main
struct MetalHiveApp: App {
    @Environment(\.scenePhase) private var phase
    @State private var scene = GameScene(size: CGSize(width: 390, height: 844))

    init() {
        Fonts.register()
    }

    var body: some Scene {
        WindowGroup {
            GameView(scene: scene)
                .ignoresSafeArea()
                .background(Color.black)
                .platformChrome()
                .onChange(of: phase) { _, newPhase in
                    if newPhase != .active { scene.autoPause() }
                }
        }
        #if os(macOS)
        .defaultSize(width: 460, height: 860)
        #endif
    }
}

private extension View {
    @ViewBuilder
    func platformChrome() -> some View {
        #if os(iOS)
        self.statusBarHidden(true)
            .persistentSystemOverlays(.hidden)
        #else
        self.frame(minWidth: 340, minHeight: 600)
        #endif
    }
}

// MARK: - Vista SpriteKit envuelta para SwiftUI

#if os(iOS)
struct GameView: UIViewRepresentable {
    let scene: GameScene

    func makeUIView(context: Context) -> SKView {
        let view = SKView()
        view.isMultipleTouchEnabled = true
        view.ignoresSiblingOrder = true
        view.preferredFramesPerSecond = 120
        #if DEBUG
        view.showsFPS = true
        view.showsNodeCount = true
        #endif
        scene.scaleMode = .resizeFill
        view.presentScene(scene)
        return view
    }

    func updateUIView(_ uiView: SKView, context: Context) {}
}
#else
/// En Mac el SKView recibe el teclado directamente (sin pitidos del sistema).
final class GameSKView: SKView {
    override var acceptsFirstResponder: Bool { true }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        window?.makeFirstResponder(self)
    }

    override func keyDown(with event: NSEvent) {
        (scene as? GameScene)?.key(event.keyCode, down: true, isRepeat: event.isARepeat)
    }

    override func keyUp(with event: NSEvent) {
        (scene as? GameScene)?.key(event.keyCode, down: false, isRepeat: false)
    }
}

struct GameView: NSViewRepresentable {
    let scene: GameScene

    func makeNSView(context: Context) -> SKView {
        let view = GameSKView()
        view.ignoresSiblingOrder = true
        view.preferredFramesPerSecond = 120
        #if DEBUG
        view.showsFPS = true
        view.showsNodeCount = true
        #endif
        scene.scaleMode = .resizeFill
        view.presentScene(scene)
        return view
    }

    func updateNSView(_ nsView: SKView, context: Context) {}
}
#endif
