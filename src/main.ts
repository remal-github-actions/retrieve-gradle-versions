import * as core from '@actions/core'
import {HttpClient, HttpClientError} from '@actions/http-client'
import {retry} from 'ts-retry-promise'
import {lastVersionByNumber} from './internal/lastVersionByNumber'
import {compareVersions, Version} from './internal/Version'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        const httpClient = new HttpClient()
        try {
            const gradleVersions = await retry(
                () => httpClient.getJson<GradleVersion[]>('https://services.gradle.org/versions/all', {
                    Accept: 'application/json',
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
                    retries: 3,
                    delay: 5000,
                }
            )

            const minVersion = Version.parse(core.getInput('min'))
            const maxVersion = Version.parse(core.getInput('max'))

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

            if (minVersion || maxVersion) {
                const filter: (string) => boolean = version => {
                    version = version.split('-')[0]
                    if (minVersion && minVersion.compareTo(version) > 0) {
                        return false
                    }
                    if (maxVersion && maxVersion.compareTo(version) < 0) {
                        return false
                    }
                    return true
                }
                rcVersions = rcVersions.filter(filter)
                releaseVersions = releaseVersions.filter(filter)
            }

            const rcVersion: Version | undefined = (function () {
                if (rcVersions.length === 0) {
                    return undefined
                }
                if (rcVersions.length > 1) {
                    core.warning(`Several active RC versions:\n  ${rcVersions.join('\n  ')}`)
                }
                return rcVersions[0]
            })()

            releaseVersions.sort(compareVersions)


            const all = [...releaseVersions]
            core.info(`all: ${all.join(', ')}`)
            core.setOutput('all', JSON.stringify(all))

            const allAndRC = [...all]
            if (rcVersion !== undefined) {
                allAndRC.push(rcVersion)
            }
            core.info(`allAndRC: ${allAndRC.join(', ')}`)
            core.setOutput('allAndRC', JSON.stringify(allAndRC))

            const majors = lastVersionByNumber(all, 2)
            core.info(`majors: ${majors.join(', ')}`)
            core.setOutput('majors', JSON.stringify(majors))

            const majorsAndRC = [...majors]
            if (rcVersion !== undefined) {
                majorsAndRC.push(rcVersion)
            }
            core.info(`majorsAndRC: ${majorsAndRC.join(', ')}`)
            core.setOutput('majorsAndRC', JSON.stringify(majorsAndRC))

            const minors = lastVersionByNumber(all, 3)
            core.info(`minors: ${minors.join(', ')}`)
            core.setOutput('minors', JSON.stringify(minors))

            const minorsAndRC = [...minors]
            if (rcVersion !== undefined) {
                minorsAndRC.push(rcVersion)
            }
            core.info(`minorsAndRC: ${minorsAndRC.join(', ')}`)
            core.setOutput('minorsAndRC', JSON.stringify(minorsAndRC))


        } finally {
            httpClient.dispose()
        }


    } catch (error) {
        core.setFailed(error)
    }
}

//noinspection JSIgnoredPromiseFromCall
run()

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

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
