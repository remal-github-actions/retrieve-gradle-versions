import * as core from '@actions/core'
import {HttpClient, HttpClientError} from '@actions/http-client'
import compareVersions from 'compare-versions'
import {retry} from 'ts-retry-promise'

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

            const minVersion = core.getInput('min')
            if (minVersion && !compareVersions.validate(minVersion)) {
                throw new Error(`Invalid min version: ${minVersion}`)
            }

            const maxVersion = core.getInput('max')
            if (maxVersion && !compareVersions.validate(maxVersion)) {
                throw new Error(`Invalid max version: ${maxVersion}`)
            }

            let rcVersions: string[] = []
            let releaseVersions: string[] = []
            for (const gradleVersion of gradleVersions) {
                if (gradleVersion.broken
                    || gradleVersion.snapshot
                    || gradleVersion.nightly
                    || gradleVersion.releaseNightly
                    || gradleVersion.milestoneFor
                ) {
                    continue
                }

                const version = gradleVersion.version

                if (gradleVersion.activeRc) {
                    rcVersions.push(version)
                    continue
                }
                if (gradleVersion.rcFor
                    || version.includes('-milestone-')
                ) {
                    continue
                }

                if (!compareVersions.validate(version)) {
                    core.warning(`Invalid Gradle version: ${version}`)
                    continue
                }

                releaseVersions.push(version)
            }

            if (minVersion || maxVersion) {
                const filter: (string) => boolean = version => {
                    version = version.split('-')[0]
                    if (minVersion && compareVersions.compare(version, minVersion, '<')) {
                        return false
                    }
                    if (maxVersion && compareVersions.compare(version, maxVersion, '>')) {
                        return false
                    }
                    return true
                }
                rcVersions = rcVersions.filter(filter)
                releaseVersions = releaseVersions.filter(filter)
            }

            const rcVersion: string | undefined = (function () {
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
