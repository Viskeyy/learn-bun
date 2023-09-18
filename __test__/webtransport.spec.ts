// a unit test for WebTransportPolyfill
import { describe, expect, test, beforeEach } from 'bun:test';
import { WebTransportPolyfill } from '../src/index';

// suppress console.log and console.info
beforeEach(() => {
  Object.assign(globalThis, {
    console: {
      log: () => { },
      info: () => { }
    }
  })
});

describe('test .ctor', () => {
  test('should throw SyntaxError when url is not valid', () => {
    // const err = new SyntaxError("Invalid URL");
    expect(() => {
      new WebTransportPolyfill("oooo")
    }).toThrow(SyntaxError)
  });

  test('should throw SyntaxError when url is not https', () => {
    // const err = new SyntaxError("Invalid protocol");
    expect(() => {
      new WebTransportPolyfill("http://api.example.com")
    }).toThrow(SyntaxError)
  });

  test('should throw SyntaxError when url has fragement', () => {
    // const err = new SyntaxError("Fragment is not permitted");
    expect(() => {
      new WebTransportPolyfill("https://api.example.com/#abced")
    }).toThrow(SyntaxError)
  });

  test('should work', () => {
    Object.assign(globalThis, {
      WebSocket: class WebSocket {
        constructor(url: string) {
          expect(url).toBe("wss://api.example.com/");
        }
        addEventListener() { }
      },
      window: {
        addEventListener: () => { }
      }
    });
    new WebTransportPolyfill("https://api.example.com");
  });
})

describe('test close()', () => {
  test('should close the connection', () => {
    Object.assign(globalThis, {
      WebSocket: class WebSocket {
        constructor(url: string) {
          expect(url).toBe("wss://api.example.com/");
        }
        close(a: number, b: string) {
          expect(a).toBeUndefined()
          expect(b).toBeUndefined()
        }
        addEventListener() { }
      },
      console: {
        debug: () => { },
        info: () => { }
      }
    });
    const wt = new WebTransportPolyfill("https://api.example.com");
    wt.close();
  })

  test('should close the connection with code and reason', () => {
    Object.assign(globalThis, {
      WebSocket: class WebSocket {
        constructor(url: string) {
          expect(url).toBe("wss://api.example.com/");
        }
        close(a: number, b: string) {
          expect(a).toBe(4321);
          expect(b).toBe("test");
        }
        addEventListener() { }
      },
      console: {
        debug: () => { },
        info: () => { }
      }
    });
    const wt = new WebTransportPolyfill("https://api.example.com");
    wt.close({ closeCode: 4321, reason: "test" });
  });
})

describe('test server initiated stream', () => {
  beforeEach(() => {
    Object.assign(globalThis, {
      WebSocket: class WebSocket {
        constructor(url: string) {
          console.log("> connect to:", url)
        }
        addEventListener() { }
      }
    });
  })

  test('incomingBidirectionalStreams', async () => {
    const wt = new WebTransportPolyfill("https://api.example.com");
    const rs = wt.incomingBidirectionalStreams;
    const err = new Error("websocket do not support server initiated stream")
    // assert.throws(() => { rs.getReader() }, err)
    expect(() => {
      rs.getReader()
    }).toThrow()
  })

  test('incomingUniidirectionalStreams', async () => {
    const wt = new WebTransportPolyfill("https://api.example.com");
    const rs = wt.incomingUnidirectionalStreams;
    const err = new Error("websocket do not support server initiated stream")
    // assert.throws(() => { rs.getReader() }, err)
    expect(() => {
      rs.getReader()
    }).toThrow()
  })
})
