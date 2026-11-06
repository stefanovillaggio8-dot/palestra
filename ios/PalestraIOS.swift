import SwiftUI
import WebKit
import UIKit

// App iOS installabile: usa WKWebView nativo per mostrare Palestra.
@main
struct PalestraIOSApp: App {
    var body: some Scene {
        WindowGroup {
            PalestraWebView()
                .ignoresSafeArea(edges: .bottom)
                .background(Color(red: 14.0/255.0, green: 20.0/255.0, blue: 18.0/255.0))
        }
    }
}

struct PalestraWebView: UIViewRepresentable {
    private let home = URL(string: "https://stefanovillaggio8-dot.github.io/palestra/")!

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.isOpaque = false
        let bg = UIColor(red: 14.0/255.0, green: 20.0/255.0, blue: 18.0/255.0, alpha: 1)
        view.backgroundColor = bg
        view.scrollView.backgroundColor = bg
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: home, cachePolicy: .useProtocolCachePolicy))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private func isTrusted(_ url: URL) -> Bool {
            guard url.scheme?.lowercased() == "https" else { return false }
            guard url.host?.lowercased() == "stefanovillaggio8-dot.github.io" else { return false }
            return url.path == "/palestra" || url.path.hasPrefix("/palestra/")
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if isTrusted(url) || url.scheme == "about" || url.scheme == "blob" {
                decisionHandler(.allow)
                return
            }
            if ["https", "http", "mailto", "tel"].contains(url.scheme?.lowercased() ?? "") {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            guard navigationAction.targetFrame == nil,
                  let url = navigationAction.request.url else { return nil }
            if isTrusted(url) {
                webView.load(URLRequest(url: url))
            } else if ["https", "http", "mailto", "tel"].contains(url.scheme?.lowercased() ?? "") {
                UIApplication.shared.open(url)
            }
            return nil
        }

        // Il sito fidato chiede sempre il consenso prima di usare il microfono.
        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            if origin.protocol == "https" && origin.host == "stefanovillaggio8-dot.github.io" {
                decisionHandler(.prompt)
            } else {
                decisionHandler(.deny)
            }
        }
    }
}
