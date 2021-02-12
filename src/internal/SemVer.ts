type SemVerSuffixToken = string | number

export class SemVer {

    private static readonly VERSION_REGEX = /^(?<numbers>\d+(\.\d+)*)([-._+](?<suffix>.+))?$/

    private static readonly SUFFIX_DELIMITER_REGEX = /([^a-z0-9]+)|(d+)/ig

    private static readonly SUFFIX_TOKEN_ORDERS: { [key: string]: number } = {
        sp: 2,

        r: 1,
        release: 1,
        ga: 1,
        final: 1,

        snapshot: -1,

        nightly: -2,

        rc: -2,
        cr: -2,

        milestone: -3,
        m: -3,

        beta: -4,
        b: -4,

        alpha: -5,
        a: -5,

        dev: -6,
        pr: -6,
    }

    static parse(versionObject: unknown): SemVer {
        if (versionObject == null) {
            throw new VersionParsingException('Version must not be null or undefined')
        }

        const version = (versionObject as any).toString().trim()
        if (!version) {
            throw new VersionParsingException('Version must not be empty')
        }

        const matches = SemVer.VERSION_REGEX.exec(version)
        if (!matches) {
            throw new VersionParsingException(`Version doesn't match ${SemVer.VERSION_REGEX} pattern: ${version}`)
        }

        const numbers = matches.groups!.numbers.split(/[^\d]+/).map(str => parseInt(str))

        const suffix: string | null = matches.groups!.suffix
        const suffixLower = suffix?.toLowerCase()
        if (!suffixLower) {
            return new SemVer(version, numbers, '', [])
        }
        const suffixTokens: SemVerSuffixToken[] = []
        const currentToken: string[] = []
        let isCurrentTokenNumeric = false
        for (const ch of suffixLower) {
            if ('0' <= ch && ch <= '9') {
                if (isCurrentTokenNumeric) {
                    currentToken.push(ch)
                } else {
                    if (currentToken) {
                        suffixTokens.push(currentToken.join(''))
                        currentToken.length = 0
                    }
                    currentToken.push(ch)
                    isCurrentTokenNumeric = true
                }
            } else {
                if (isCurrentTokenNumeric) {
                    if (currentToken) {
                        suffixTokens.push(parseInt(currentToken.join('')))
                        currentToken.length = 0
                    }
                    currentToken.push(ch)
                    isCurrentTokenNumeric = false
                } else {
                    currentToken.push(ch)
                }
            }
        }
        if (currentToken) {
            if (isCurrentTokenNumeric) {
                suffixTokens.push(parseInt(currentToken.join('')))
            } else {
                suffixTokens.push(currentToken.join(''))
            }
        }
        return new SemVer(version, numbers, suffix, suffixTokens)
    }

    private readonly version: string
    readonly numbers: readonly number[]
    readonly suffix: string
    readonly suffixTokens: readonly SemVerSuffixToken[]

    private constructor(version: string, numbers: number[], suffix: string, suffixTokens: SemVerSuffixToken[]) {
        this.version = version
        this.numbers = [...numbers]
        this.suffix = suffix
        this.suffixTokens = [...suffixTokens]
    }

}

export class VersionParsingException extends Error {
    constructor(message: string) {
        super(message)
    }
}
