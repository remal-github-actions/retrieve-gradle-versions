import {lastVersionByNumber} from './lastVersionByNumber'
import {Version} from './Version'

describe('lastVersionByNumber', () => {

    it('simple', () => {
        expect(lastVersionByNumber([new Version('1.1'), new Version('1.2'), new Version('2.1')], 2))
            .toStrictEqual([new Version('1.2'), new Version('2.1')])
    })

    it('not enough numbers', () => {
        expect(lastVersionByNumber([new Version('1'), new Version('1.1'), new Version('2.1')], 2))
            .toStrictEqual([new Version('1.1'), new Version('2.1')])
    })

    it('cut redundant numbers', () => {
        expect(lastVersionByNumber([new Version('1.1'), new Version('1.1.1'), new Version('2.1')], 2))
            .toStrictEqual([new Version('1.1.1'), new Version('2.1')])
    })

})
