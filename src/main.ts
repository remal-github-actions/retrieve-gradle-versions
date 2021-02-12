import * as core from '@actions/core'
import {HttpClient, HttpClientError} from '@actions/http-client'
import {retry} from 'ts-retry-promise'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        const httpClient = new HttpClient()
        try {
            const versions = await retry(
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

            for (const version of versions) {
                core.info(JSON.stringify(version, null, 2))
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
    downloadUrl: string
    checksumUrl: string
    wrapperChecksumUrl: string
    current: boolean | null
    snapshot: boolean | null
    nightly: boolean | null
    releaseNightly: boolean | null
    activeRc: boolean | null
    rcFor: string | null
    milestoneFor: string | null
    broken: boolean | null
}
