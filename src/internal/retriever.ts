import * as core from '@actions/core'
import {HttpClient, HttpClientError} from '@actions/http-client'
import {retry} from 'ts-retry-promise'
import {lastVersionByNumber} from './lastVersionByNumber'
import {compareVersionsDesc, Version} from './Version'

export interface GradleVersions {
    all: readonly Version[]
    allAndRC: readonly Version[]
    majors: readonly Version[]
    majorsAndRC: readonly Version[]
    minors: readonly Version[]
    minorsAndRC: readonly Version[]
    activeRC: Version | undefined
}

const timeoutBetweenRetries = process.env.NODE_ENV !== 'test' ? 5_000 : 0

export async function retrieveGradleVersions(
    minVersions: Version[] = [],
    maxVersions: Version[] = [],
    excludedVersions: Version[] = []
): Promise<GradleVersions> {
    const httpClient = new HttpClient()
    return retry(
        () => httpClient.getJson<GradleVersion[]>('https://services.gradle.org/versions/all', {
            Accept: 'application/json',
            'Accept-Encoding': 'identity',
        })
            .then(response => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    return response.result!
                } else {
                    throw new HttpClientError(
                        `Request failed with status ${response.statusCode}`,
                        response.statusCode
                    )
                }
            }),
        {
            retries: 2,
            delay: timeoutBetweenRetries,
        }
    )
        .then(gradleVersions => {
            let rcVersions: Version[] = []
            let releaseVersions: Version[] = []
            for (const gradleVersion of gradleVersions) {
                if (gradleVersion.broken
                    || gradleVersion.snapshot
                    || gradleVersion.nightly
                    || gradleVersion.releaseNightly
                    || gradleVersion.milestoneFor
                ) {
                    continue
                }

                const version = Version.parse(gradleVersion.version)
                if (version === undefined) {
                    core.warning(`Invalid Gradle version: ${gradleVersion.version}`)
                    continue
                }

                if (gradleVersion.activeRc) {
                    rcVersions.push(version)
                    continue
                }
                if (gradleVersion.rcFor
                    || version.hasSuffix
                ) {
                    continue
                }

                releaseVersions.push(version)
            }

            const filter: (string) => boolean = version => {
                version = version.withoutSuffix()
                if (minVersions.some(minVersion => minVersion.compareTo(version) > 0)) {
                    return false
                }
                if (maxVersions.some(maxVersion => maxVersion.compareTo(version) < 0)) {
                    return false
                }
                if (excludedVersions.some(excludedVersion => excludedVersion.compareTo(version) == 0)) {
                    return false
                }
                return true
            }
            rcVersions = rcVersions.filter(filter)
            releaseVersions = releaseVersions.filter(filter)

            rcVersions.sort(compareVersionsDesc)
            releaseVersions.sort(compareVersionsDesc)

            const rcVersion: Version | undefined = (function () {
                if (rcVersions.length === 0) {
                    return undefined
                }
                if (rcVersions.length > 1) {
                    core.warning(`Several active RC versions:\n  ${rcVersions.join('\n  ')}`)
                }
                return rcVersions[0]
            })()

            const all = [...releaseVersions]
            const allAndRC = [...all]
            if (rcVersion !== undefined) {
                allAndRC.unshift(rcVersion)
            }

            const majors = lastVersionByNumber(all, 2)
            const majorsAndRC = [...majors]
            if (rcVersion !== undefined) {
                majorsAndRC.unshift(rcVersion)
            }

            const minors = lastVersionByNumber(all, 3)
            const minorsAndRC = [...minors]
            if (rcVersion !== undefined) {
                minorsAndRC.unshift(rcVersion)
            }

            return {
                all,
                allAndRC,
                majors,
                majorsAndRC,
                minors,
                minorsAndRC,
                activeRC: rcVersion
            }
        })
        .finally(() => httpClient.dispose())
}


interface GradleVersion {
    version: string
    buildTime: string
    current: boolean | null
    snapshot: boolean | null
    nightly: boolean | null
    releaseNightly: boolean | null
    activeRc: boolean | null
    rcFor: string | null
    milestoneFor: string | null
    broken: boolean | null
}
