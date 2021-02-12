import * as core from '@actions/core'
import {HttpClient, HttpClientError} from '@actions/http-client'
import {retry} from 'ts-retry-promise'
import {SemVer} from './internal/SemVer'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        core.info(`1-rc-1: ${SemVer.parse('1-rc-1').suffixTokens.join(', ')}`)
        core.info(`1-rc1: ${SemVer.parse('1-rc-1').suffixTokens.join(', ')}`)

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

            const minVersion = SemVer.parse(core.getInput('minVersion'))

            let rcVersion: SemVer | undefined = undefined
            const releaseVersions: SemVer[] = []
            for (const gradleVersion of gradleVersions) {
                if (gradleVersion.broken
                    || gradleVersion.snapshot
                    || gradleVersion.nightly
                    || gradleVersion.releaseNightly
                    || gradleVersion.milestoneFor
                ) {
                    continue
                }

                const version = SemVer.parse(gradleVersion.version)

                if (!rcVersion && gradleVersion.activeRc) {
                    rcVersion = version
                }
                if (gradleVersion.rcFor
                    || version.suffix
                ) {
                    continue
                }

                releaseVersions.push(version)
            }

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
