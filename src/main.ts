import * as core from '@actions/core'
import {retrieveGradleVersions} from './internal/retriever'
import {Version} from './internal/Version'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        const minVersions = core.getInput('min').split(/[,;]/)
            .map(it => it.trim())
            .filter(it => it.length)
            .map(Version.parse)
            .filter(it => it != null) as Version[]

        const maxVersions = core.getInput('max').split(/[,;]/)
            .map(it => it.trim())
            .filter(it => it.length)
            .map(Version.parse)
            .filter(it => it != null) as Version[]

        const excludedVersions = core.getInput('exclude').split(/[,;]/)
            .map(it => it.trim())
            .filter(it => it.length)
            .map(Version.parse)
            .filter(it => it != null) as Version[]

        const versions = await retrieveGradleVersions(minVersions, maxVersions, excludedVersions)

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
        core.setFailed(error instanceof Error ? error : (error as object).toString())
        throw error
    }
}

//noinspection JSIgnoredPromiseFromCall
run()
