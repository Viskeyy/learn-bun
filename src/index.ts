// import "regenerator-runtime/runtime.js";
import { BidirectionalStream } from "./BidirectionalStream";
import { WebTransportCloseInfo } from "./CloseInfo";
import { Datagrams } from "./Datagrams";
import { ServerInitiatedStreams } from "./ServerInitiatedStreams";
import { UnidirectionalStream } from "./UnidirectionalStream";

declare global {
  interface Window {
    WebTransport: any;
  }
}

// https://www.w3.org/TR/webtransport/#web-transport
export class WebTransportPolyfill {
  public closed: Promise<unknown>;
  public ready: Promise<unknown>;
  public close: (closeInfo?: WebTransportCloseInfo) => void;
  datagrams: Datagrams | null = null;
  public incomingBidirectionalStreams: ServerInitiatedStreams =
    new ServerInitiatedStreams();
  public incomingUnidirectionalStreams: ServerInitiatedStreams =
    new ServerInitiatedStreams();
  #ws: WebSocket | null = null;
  #url: string
  #reconnect: Boolean = false;
  // the instance id of WebSocket
  #sid: number = 0;
  #connErr: any;

  // https://www.w3.org/TR/webtransport/#webtransport-constructor
  // constructor(USVString url, optional WebTransportOptions options = {});
  constructor(_url: string, options?: any) {
    if (options) {
      this.#reconnect = options.reconnect || false;
    }
    let url: URL;
    try {
      url = new URL(_url);
      if (url.protocol !== "https:") {
        // 5.2.3 If parsedURL scheme is not https, throw a SyntaxError exception.
        // be careful, do not allow `wss` protocol here, this prevents code reuseable when upgrade to webtransport. otherwise, developer need to change `wss` to `https` when upgrade from websocket to webtransport.
        throw new SyntaxError("Invalid protocol");
      }
      if (url.hash !== "") {
        // 5.2.4 If parsedURL fragment is not null, throw a SyntaxError exception.
        throw new SyntaxError("Fragment is not permitted");
      }
    } catch (err) {
      // 5.2.2 If parsedURL is a failure, throw a SyntaxError exception
      throw new SyntaxError(err.message);
    }

    // change `https` to `wss`
    url.protocol = "wss";
    // let parsedUrl = url.toString();

    this.#url = url.toString();
    this.#connect();

    // reconnect
    // this.#ws.addEventListener("close", (e) => {
    //   console.debug("CCCC-onclose, start reconnect", { e });
    //   this.#connect();
    //   this.#init();
    // })
    // this.#ws = new WebSocket(this.#url);
    // this.#ws.binaryType = "arraybuffer";

    // this.#init();
  }

  #connect() {
    this.#ws = null;
    const ws = new WebSocket(this.#url);
    Object.assign(ws, { sid: this.#sid })
    ws.binaryType = "arraybuffer";
    // onopen
    ws.addEventListener("open", (e) => { console.debug(`[${this.#sid}] connected`) });
    // define reconnect handler
    const reconnectHandler = (closeEvent) => {
      if (closeEvent.code < 2000) {
        // https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4
        // 1006: is a reserved value and MUST NOT be set as a status code in a Close control frame by an endpoint. It is designated for use in applications expecting a status code to indicate that the connection was closed abnormally, e.g., without sending or receiving a Close control frame.
        ws.removeEventListener("close", reconnectHandler)
        if (this.#reconnect) {
          // wait 1~4 seconds to reconnect
          const rand = (Math.random() * 3 + 1) * 1000;
          setTimeout(() => {
            this.#sid++
            this.#connect();
          }, rand);
        }
      } else {
        console.debug(`[${this.#sid}]DO NOT reconnect because of error code`);
      }
    };
    // reconnect
    if (this.#reconnect) {
      ws.addEventListener("close", reconnectHandler)
    }
    this.#ws = ws;
    // remove `onclose` reconnect handler before page unload, this makes developers feels good when debugging their
    // web apps with F5/refresh page.
    globalThis.window.addEventListener('beforeunload', () => {
      console.debug(`[${this.#sid}]beforeunload, purge listeners`)
      ws.removeEventListener("close", reconnectHandler)
    });
    this.#init()
  }

  #init() {
    console.info(
      "%c%s",
      "color: white; background-color: green",
      "WebTransport polyfilled for " + this.#url
    );

    // readonly attribute Promise<WebTransportCloseInfo> closed;
    this.closed = new Promise((resolve, reject) => {
      if (!this.#ws) {
        return reject(Error("WebTransport is closed"));
      }
      this.#ws.addEventListener("close", (closeEvent) => {
        resolve(closeEvent);
      });
    });

    // readonly attribute Promise<undefined> ready;
    this.ready = new Promise((resolve, reject) => {
      if (!this.#ws) {
        return reject(Error("WebTransport is closed"));
      }

      this.#ws.addEventListener("open", () => {
        resolve(null);
      });

      this.#ws.addEventListener("error", (evt) => {
        // console.debug("#ws.addEventListener(error)", { evt });
        // console.debug("#ws.addEventListener(error)", evt.target);
        // TODO: this `err` is a Event, not Error
        // this.#connErr = evt;
        reject(evt);
      });

      this.datagrams = new Datagrams(this.#ws);
    });

    // https://www.w3.org/TR/webtransport/#dom-webtransport-close
    this.close = (closeInfo?: WebTransportCloseInfo) => {
      this.#reconnect = false;
      console.debug("USR-close(), stop reconnect")
      if (this.#ws && this.#ws.readyState <= WebSocket.OPEN) {
        this.#ws.close(closeInfo?.closeCode, closeInfo?.reason);
      }
    };
  }

  // Promise<WebTransportBidirectionalStream> createBidirectionalStream(optional WebTransportSendStreamOptions options = {});
  createBidirectionalStream(): Promise<BidirectionalStream> {
    return new Promise((resolve, reject) => {
      if (!this.#ws) return reject(Error("WebTransport is closed"));
      resolve(new BidirectionalStream(this.#ws));
    });
  }

  // Promise<WebTransportUnidirectionalStream> createBidirectionalStream(optional WebTransportSendStreamOptions options = {});
  createUnidirectionalStream(): Promise<UnidirectionalStream> {
    return new Promise((resolve, reject) => {
      if (!this.#ws) return reject(Error("WebTransport is closed"));
      resolve(new UnidirectionalStream(this.#ws));
    });
  }
}

// if (typeof window !== "undefined") {
//   if (typeof window.WebTransport === "undefined") {
//     window.WebTransport = WebTransportPolyfill;
//   }
// }

if (typeof globalThis !== "undefined") {
  if (typeof globalThis.WebTransport === "undefined") {
    Object.defineProperty(globalThis, "WebTransport", WebTransportPolyfill)
  } else {
    console.debug("[PL]: WebTransport is native supported")
  }
} else {
  console.debug("[PL]: globalThis is undefined")
}

export default WebTransportPolyfill;
