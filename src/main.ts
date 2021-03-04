import * as core from '@actions/core'
import {retrieveGradleVersions} from './internal/retriever'
import {Version} from './internal/Version'

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

async function run(): Promise<void> {
    try {
        const minVersion = Version.parse(core.getInput('min'))
        const maxVersion = Version.parse(core.getInput('max'))

        const versions = await retrieveGradleVersions(minVersion, maxVersion)

        core.info(`all: ${versions.all.join(', ')}`)
        core.setOutput('all', JSON.stringify(versions.all))

        core.info(`allAndRC: ${versions.allAndRC.join(', ')}`)
        core.setOutput('allAndRC', JSON.stringify(versions.allAndRC))

        core.info(`majors: ${versions.majors.join(', ')}`)
        core.setOutput('majors', JSON.stringify(versions.majors))

        core.info(`majorsAndRC: ${versions.majorsAndRC.join(', ')}`)
        core.setOutput('majorsAndRC', JSON.stringify(versions.majorsAndRC))

        core.info(`minors: ${versions.minors.join(', ')}`)
        core.setOutput('minors', JSON.stringify(versions.minors))

        core.info(`minorsAndRC: ${versions.minorsAndRC.join(', ')}`)
        core.setOutput('minorsAndRC', JSON.stringify(versions.minorsAndRC))


    } catch (error) {
        core.setFailed(error)
    }
}

//noinspection JSIgnoredPromiseFromCall
run()
