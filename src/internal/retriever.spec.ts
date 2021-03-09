import nock from 'nock'
import {retrieveGradleVersions} from './retriever'
import {Version} from './Version'

describe('retriever', () => {

    beforeAll(nock.disableNetConnect)
    afterAll(nock.restore)

    afterEach(nock.cleanAll)

    it('positive scenario', () => {
        nock('https://services.gradle.org').persist()
            .get('/versions/all')
            .reply(200, JSON.stringify([
                {
                    "version": "7.0-20210304122053+0000", // <-- has unsupported suffix, should be omitted
                    "current": false,
                    "snapshot": true,
                    "nightly": true,
                    "releaseNightly": false,
                    "activeRc": false,
                    "rcFor": "",
                    "milestoneFor": "",
                    "broken": false,
                },
                {
                    "version": "7.0-rc-1",
                    "current": false,
                    "snapshot": false,
                    "nightly": false,
                    "releaseNightly": false,
                    "activeRc": true, // <-- RC, but not the highest, should be omitted
                    "rcFor": "7.0",
                    "milestoneFor": "",
                    "broken": false,
                },
                {
                    "version": "7.0-rc-2",
                    "current": false,
                    "snapshot": false,
                    "nightly": false,
                    "releaseNightly": false,
                    "activeRc": true, // <-- RC
                    "rcFor": "7.0",
                    "milestoneFor": "",
                    "broken": false,
                },
                {
                    "version": "6.8.3",
                    "current": true,
                    "snapshot": false,
                    "nightly": false,
                    "releaseNightly": false,
                    "activeRc": false,
                    "rcFor": "",
                    "milestoneFor": "",
                    "broken": false,
                },
                {
                    "version": "6.8.2",
                    "current": false,
                    "snapshot": false,
                    "nightly": false,
                    "releaseNightly": false,
                    "activeRc": false,
                    "rcFor": "",
                    "milestoneFor": "",
                    "broken": false,
                },
                {
                    "version": "6.8.1",
                    "current": false,
                    "snapshot": false,
                    "nightly": false,
                    "releaseNightly": false,
                    "activeRc": false,
                    "rcFor": "",
                    "milestoneFor": "",
                    "broken": true, // <-- broken, should be omitted
                },
                {
                    "version": "6.7",
                    "current": false,
                    "snapshot": false,
                    "nightly": false,
                    "releaseNightly": false,
                    "activeRc": false,
                    "rcFor": "",
                    "milestoneFor": "",
                    "broken": false,
                },
                {
                    "version": "5.10",
                    "current": false,
                    "snapshot": false,
                    "nightly": false,
                    "releaseNightly": false,
                    "activeRc": false,
                    "rcFor": "",
                    "milestoneFor": "",
                    "broken": false,
                },
            ]))

        return retrieveGradleVersions()
            .then(versions => {
                expect(versions.all).toStrictEqual([
                    new Version('6.8.3'),
                    new Version('6.8.2'),
                    new Version('6.7'),
                    new Version('5.10'),
                ])
                expect(versions.allAndRC).toStrictEqual(versions.all.concat([
                    new Version('7.0-rc-2'),
                ]))

                expect(versions.majors).toStrictEqual([
                    new Version('6.8.3'),
                    new Version('5.10'),
                ])
                expect(versions.majorsAndRC).toStrictEqual(versions.majors.concat([
                    new Version('7.0-rc-2'),
                ]))

                expect(versions.minors).toStrictEqual([
                    new Version('6.8.3'),
                    new Version('6.7'),
                    new Version('5.10'),
                ])
                expect(versions.minorsAndRC).toStrictEqual(versions.minors.concat([
                    new Version('7.0-rc-2'),
                ]))
            })
    })

    it('server error', () => {
        let requestsCount = 0
        nock('https://services.gradle.org').persist()
            .get('/versions/all')
            .reply(500)
            .on('request', () =>
                ++requestsCount
            )

        return retrieveGradleVersions()
            .then(exceptionExpected)
            .catch(exceptionExpected)
            .finally(() => expect(requestsCount).toBe(3))
    })

})

function exceptionExpected(data) {
    if (data instanceof Error) {
        // OK
    } else {
        throw new Error('exception expected')
    }
}