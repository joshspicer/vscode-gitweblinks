// tslint:disable:max-line-length

import { expect } from 'chai';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as sinon from 'sinon';

import { CustomServerProvider } from '../../src/configuration/CustomServerProvider';
import {
    LinkType,
    LinkTypeProvider
} from '../../src/configuration/LinkTypeProvider';
import { Git } from '../../src/git/Git';
import { GitInfo } from '../../src/git/GitInfo';
import { GitHubHandler } from '../../src/links/GitHubHandler';
import { ServerUrl } from '../../src/utilities/ServerUrl';
import { setupRepository } from '../test-helpers/setup-repository';

describe('GitHubHandler', () => {
    function getCloudRemotes(): string[] {
        return [
            'https://github.com/dotnet/corefx.git',
            'https://username@github.com/dotnet/corefx.git',
            'git@github.com:dotnet/corefx.git',
            'ssh://git@github.com:dotnet/corefx.git'
        ];
    }

    function stubGetServers(servers?: ServerUrl[]): void {
        if (!servers) {
            servers = [
                {
                    baseUrl: 'https://local-github',
                    sshUrl: 'git@local-github'
                }
            ];
        }

        sinon
            .stub(CustomServerProvider.prototype, 'getServers')
            .withArgs('gitHubEnterprise')
            .returns(servers);
    }

    afterEach(() => {
        sinon.restore();
    });

    describe('isMatch', () => {
        [
            'https://github.com/dotnet/corefx.git',
            'git@github.com:dotnet/corefx.git',
            'ssh://git@github.com:dotnet/corefx.git'
        ].forEach((remote) => {
            it(`should match GitHub server URL '${remote}'.`, () => {
                let handler: GitHubHandler;

                stubGetServers();

                handler = new GitHubHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });

        [
            'https://local-github/dotnet/corefx.git',
            'git@local-github:dotnet/corefx.git',
            'ssh://git@local-github:dotnet/corefx.git'
        ].forEach((remote) => {
            it(`should match server URL from settings for remote '${remote}'`, () => {
                let handler: GitHubHandler;

                stubGetServers([
                    {
                        baseUrl: 'https://local-github',
                        sshUrl: 'git@local-github'
                    }
                ]);

                handler = new GitHubHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });

        it('should not match server URLs not in the settings.', () => {
            let handler: GitHubHandler;

            stubGetServers([
                { baseUrl: 'https://local-github', sshUrl: 'git@local-github' }
            ]);

            handler = new GitHubHandler();

            expect(handler.isMatch('https://codeplex.com/foo/bar.git')).to.be
                .false;
        });
    });

    describe('makeUrl', () => {
        let root: string;
        let type: LinkType;

        beforeEach(async () => {
            root = await setupRepository();
            type = 'branch';

            sinon
                .stub(LinkTypeProvider.prototype, 'getLinkType')
                .callsFake(() => type);
        });

        afterEach(() => {
            rimraf.sync(root);
        });

        getCloudRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'`, async () => {
                let handler: GitHubHandler;
                let info: GitInfo;
                let fileName: string;

                stubGetServers();

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(
                    root,
                    'src/System.IO.FileSystem/src/System/IO/Directory.cs'
                );
                handler = new GitHubHandler();

                expect(
                    await handler.makeUrl(info, fileName, undefined)
                ).to.equal(
                    'https://github.com/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs'
                );
            });
        });

        it('should create the correct link when the server URL ends with a slash.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers([
                { baseUrl: 'https://local-github/', sshUrl: 'git@local-github' }
            ]);

            info = {
                rootDirectory: root,
                remoteUrl: 'https://local-github/dotnet/corefx.git'
            };
            fileName = path.join(
                root,
                'src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
            handler = new GitHubHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-github/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
        });

        it('should create the correct link when the server URL whends with a colon.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers([
                { baseUrl: 'https://local-github', sshUrl: 'git@local-github:' }
            ]);

            info = {
                rootDirectory: root,
                remoteUrl: 'git@local-github:dotnet/corefx.git'
            };
            fileName = path.join(
                root,
                'src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
            handler = new GitHubHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-github/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
        });

        it('creates correct link when path contains spaces.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@github.com:dotnet/corefx.git'
            };
            fileName = path.join(root, 'src/sub dir/Directory.cs');
            handler = new GitHubHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://github.com/dotnet/corefx/blob/master/src/sub%20dir/Directory.cs'
            );
        });

        it('should create the correct link with a single line selection.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@github.com:dotnet/corefx.git'
            };
            fileName = path.join(
                root,
                'src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
            handler = new GitHubHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 38,
                    endLine: 38,
                    startColumn: 1,
                    endColumn: 1
                })
            ).to.equal(
                'https://github.com/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs#L38'
            );
        });

        it('should create the correct link with a multi-line selection.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@github.com:dotnet/corefx.git'
            };
            fileName = path.join(
                root,
                'src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
            handler = new GitHubHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 38,
                    endLine: 49,
                    startColumn: 1,
                    endColumn: 1
                })
            ).to.equal(
                'https://github.com/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs#L38-L49'
            );
        });

        it('should use the current branch.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@github.com:dotnet/corefx.git'
            };
            fileName = path.join(
                root,
                'src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
            handler = new GitHubHandler();
            type = 'branch';

            await Git.execute(root, 'checkout', '-b', 'feature/thing');

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://github.com/dotnet/corefx/blob/feature/thing/src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
        });

        it('should use the current hash.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;
            let sha: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@github.com:dotnet/corefx.git'
            };
            fileName = path.join(
                root,
                'src/System.IO.FileSystem/src/System/IO/Directory.cs'
            );
            handler = new GitHubHandler();
            type = 'hash';

            sha = (await Git.execute(root, 'rev-parse', 'HEAD')).trim();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                `https://github.com/dotnet/corefx/blob/${sha}/src/System.IO.FileSystem/src/System/IO/Directory.cs`
            );
        });
    });
});
