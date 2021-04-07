import * as core from '@actions/core'
import {retrieveGradleVersions} from './internal/retriever'
import {Version} from './internal/Version'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        const minVersion = Version.parse(core.getInput('min'))
        const maxVersion = Version.parse(core.getInput('max'))

        const versions = await retrieveGradleVersions(minVersion, maxVersion)

        Object.entries(versions).forEach(([key, value]) => {
            if (value == null) {
                // skip NULLs
            } else if (Array.isArray(value)) {
                core.info(`${key}: ${value.join(', ')}`)
                core.setOutput(key, JSON.stringify(value, (__, obj) => {
                    if (obj instanceof Version) {
                        return obj.toString()
                    } else {
                        return obj
                    }
                }))
            } else {
                core.info(`${key}: ${value}`)
                core.setOutput(key, value.toString())
            }
        })


    } catch (error) {
        core.setFailed(error)
    }
}

//noinspection JSIgnoredPromiseFromCall
run()
