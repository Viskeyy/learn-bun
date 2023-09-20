// a unit test for WebTransportPolyfill
import { describe, expect, test, beforeEach } from 'bun:test';
import * as WebTransport from '../src/index';

console.log(WebTransport);

// suppress console.log and console.info
beforeEach(() => {});

describe('test .ctor', () => {
    test('should throw SyntaxError when url is not valid', () => {
        // const err = new SyntaxError("Invalid URL");
        expect(() => new globalThis.WebTransport('oooo')).toThrow(SyntaxError);
    });

    test('should throw SyntaxError when url is not https', () => {
        // const err = new SyntaxError("Invalid protocol");
        expect(
            () => new globalThis.WebTransport('wss://lo.yomo.dev:8443')
        ).toThrow(SyntaxError);
    });

    test('should throw SyntaxError when url has fragement', () => {
        // const err = new SyntaxError("Fragment is not permitted");
        expect(
            () => new globalThis.WebTransport('https://lo.yomo.dev:8443/#abced')
        ).toThrow(SyntaxError);
    });

    test('should work', () =>
        new globalThis.WebTransport('https://lo.yomo.dev:8443/v1'));
});

describe('test close()', () => {
    test('should close the connection', () => {
        const wt = new globalThis.WebTransport('https://lo.yomo.dev:8443');
        wt.close();
    });

    test('should close the connection with code and reason', () => {
        const wt = new globalThis.WebTransport('https://lo.yomo.dev:8443');
        wt.close({ closeCode: 4321, reason: 'test' });
    });
});

describe('test server initiated stream', () => {
    test('incomingBidirectionalStreams', async () => {
        const wt = new globalThis.WebTransport('https://lo.yomo.dev:8443');
        const rs = wt.incomingBidirectionalStreams;
        const err = new Error(
            'websocket do not support server initiated stream'
        );
        // assert.throws(() => { rs.getReader() }, err)
        expect(() => rs.getReader()).toThrow();
    });

    test('incomingUniidirectionalStreams', async () => {
        const wt = new globalThis.WebTransport('https://lo.yomo.dev:8443');
        const rs = wt.incomingUnidirectionalStreams;
        const err = new Error(
            'websocket do not support server initiated stream'
        );
        // assert.throws(() => { rs.getReader() }, err)
        expect(() => rs.getReader()).toThrow();
    });
});
