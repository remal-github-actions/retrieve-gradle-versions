import {compareVersions, Version} from './Version'

export function lastVersionByNumber(versions: Version[], pos: number): Version[] {
    const grouped: { [key: string]: Version } = {}
    for (const version of versions) {
        const key = version.withoutSuffix().withoutNumber(pos + 1).withNumber(pos, 0).toString()
        const prev = grouped[key]
        if (!prev || prev.compareTo(version) < 0) {
            grouped[key] = version
        }
    }

    const result = Object.values(grouped)
    result.sort(compareVersions)
    return result
}
