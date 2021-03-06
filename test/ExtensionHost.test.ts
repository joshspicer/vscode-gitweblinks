import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';

import { CopyLinkToFileCommand } from '../src/commands/CopyLinkToFileCommand';
import { CopyLinkToSelectionCommand } from '../src/commands/CopyLinkToSelectionCommand';
import { ExtensionHost } from '../src/ExtensionHost';
import { Git } from '../src/git/Git';
import { GitInfo } from '../src/git/GitInfo';
import { GitInfoFinder } from '../src/git/GitInfoFinder';
import { LinkHandler } from '../src/links/LinkHandler';
import { LinkHandlerFinder } from '../src/links/LinkHandlerFinder';

const expect = chai.use(sinonChai).expect;

describe('ExtensionHost', () => {
    describe('activate', () => {
        let context: vscode.ExtensionContext;
        let onDidChangeWorkspaceFolders: (
            e: vscode.WorkspaceFoldersChangeEvent
        ) => Promise<void>;

        function mockContext(): vscode.ExtensionContext {
            return ({
                subscriptions: []
            } as any) as vscode.ExtensionContext;
        }

        beforeEach(() => {
            context = mockContext();
            onDidChangeWorkspaceFolders = undefined as any;

            sinon.stub(vscode, 'workspace').value({
                workspaceFolders: undefined,
                onDidChangeWorkspaceFolders: (
                    callback: (
                        e: vscode.WorkspaceFoldersChangeEvent
                    ) => Promise<void>
                ) => {
                    onDidChangeWorkspaceFolders = callback;
                    return { dispose: () => undefined };
                }
            });
        });

        afterEach(async () => {
            context.subscriptions.forEach((d) => d.dispose());
            sinon.restore();
        });

        it('should add the commands to the subscriptions when Git is initialized.', async () => {
            sinon.stub(Git, 'test').resolves();
            sinon.stub(GitInfoFinder.prototype, 'find').resolves(undefined);
            sinon.stub(LinkHandlerFinder.prototype, 'find').returns(undefined);

            await new ExtensionHost().activate(context);

            expect(
                context.subscriptions.filter(
                    (x) => x instanceof CopyLinkToFileCommand
                )
            ).to.have.lengthOf(1);
            expect(
                context.subscriptions.filter(
                    (x) => x instanceof CopyLinkToSelectionCommand
                )
            ).to.have.lengthOf(1);
        });

        it('should disable the commands if Git is not initialized.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;

            test = sinon.stub(Git, 'test').rejects(new Error('nope'));
            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(undefined);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(undefined);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            await new ExtensionHost().activate(context);

            expect(test).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                false
            );

            expect(findGitInfo).to.have.not.been.called;
            expect(findHandler).to.have.not.been.called;
        });

        it('should disable the commands if there are no workspaces.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;

            test = sinon.stub(Git, 'test').resolves();
            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(undefined);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(undefined);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            sinon
                .stub(vscode.workspace, 'workspaceFolders')
                .get(() => undefined);

            await new ExtensionHost().activate(context);

            expect(test).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                false
            );

            expect(findGitInfo).to.have.not.been.called;
            expect(findHandler).to.have.not.been.called;
        });

        it('should disable the commands if Git info is not found.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;

            test = sinon.stub(Git, 'test').resolves();
            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(undefined);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(undefined);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            sinon.stub(vscode.workspace, 'workspaceFolders').get(() => [
                {
                    index: 0,
                    name: 'foo',
                    uri: vscode.Uri.parse('file:///abc')
                }
            ]);

            await new ExtensionHost().activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                false
            );

            expect(findHandler).to.have.not.been.called;
        });

        it('should disable the commands if no link handler was found.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;
            let info: GitInfo;

            info = { rootDirectory: 'a', remoteUrl: 'b' };

            test = sinon.stub(Git, 'test').resolves();
            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(info);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(undefined);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            sinon.stub(vscode.workspace, 'workspaceFolders').get(() => [
                {
                    index: 0,
                    name: 'foo',
                    uri: vscode.Uri.parse('file:///abc')
                }
            ]);

            await new ExtensionHost().activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(findHandler).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                false
            );
        });

        it('should enable the commands if a link handler was found.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;
            let info: GitInfo;
            let handler: LinkHandler;
            let commands: string[];

            info = { rootDirectory: 'a', remoteUrl: 'b' };
            handler = {} as any;

            test = sinon.stub(Git, 'test').resolves();
            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(info);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(handler);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            sinon.stub(vscode.workspace, 'workspaceFolders').get(() => [
                {
                    index: 0,
                    name: 'foo',
                    uri: vscode.Uri.parse('file:///abc')
                }
            ]);

            await new ExtensionHost().activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(findHandler).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                true
            );

            commands = await vscode.commands.getCommands();
            expect(commands).to.contain('gitweblinks.copyFile');
            expect(commands).to.contain('gitweblinks.copySelection');
        });

        it('should enable the commands when a new workspace with Git Info is added.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;
            let info: GitInfo;
            let handler: LinkHandler;
            let commands: string[];

            info = { rootDirectory: 'a', remoteUrl: 'b' };
            handler = {} as any;

            test = sinon.stub(Git, 'test').resolves();

            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(info);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(handler);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            sinon
                .stub(vscode.workspace, 'workspaceFolders')
                .get(() => undefined);

            await new ExtensionHost().activate(context);

            expect(onDidChangeWorkspaceFolders).to.exist;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                false
            );

            await onDidChangeWorkspaceFolders({
                added: [
                    {
                        index: 0,
                        name: 'foo',
                        uri: vscode.Uri.parse('file:///foo')
                    }
                ],
                removed: []
            });

            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                true
            );
        });

        it('should keep commands enabled when a workspace with Git Info is removed, but others remain.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;
            let info: GitInfo;
            let handler: LinkHandler;
            let commands: string[];

            info = { rootDirectory: 'a', remoteUrl: 'b' };
            handler = {} as any;

            test = sinon.stub(Git, 'test').resolves();

            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(info);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(handler);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            sinon.stub(vscode.workspace, 'workspaceFolders').get(() => [
                {
                    index: 0,
                    name: 'foo',
                    uri: vscode.Uri.parse('file:///foo')
                },
                {
                    index: 1,
                    name: 'bar',
                    uri: vscode.Uri.parse('file:///bar')
                }
            ]);

            await new ExtensionHost().activate(context);

            expect(onDidChangeWorkspaceFolders).to.exist;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                true
            );

            await onDidChangeWorkspaceFolders({
                added: [],
                removed: [vscode.workspace.workspaceFolders![0]]
            });

            expect(executeCommand).to.have.not.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                false
            );
        });

        it('should disable the commands when a workspace with Git Info is removed and no others remain.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy<
                [string, ...any[]],
                Thenable<unknown>
            >;
            let info: GitInfo;
            let handler: LinkHandler;
            let commands: string[];
            let folder: vscode.WorkspaceFolder;

            info = { rootDirectory: 'a', remoteUrl: 'b' };
            handler = {} as any;

            test = sinon.stub(Git, 'test').resolves();

            findGitInfo = sinon
                .stub(GitInfoFinder.prototype, 'find')
                .resolves(info);
            findHandler = sinon
                .stub(LinkHandlerFinder.prototype, 'find')
                .returns(handler);
            executeCommand = sinon.spy(vscode.commands, 'executeCommand');

            folder = {
                index: 0,
                name: 'foo',
                uri: vscode.Uri.parse('file:///foo')
            };

            sinon
                .stub(vscode.workspace, 'workspaceFolders')
                .get(() => [folder]);

            await new ExtensionHost().activate(context);

            expect(onDidChangeWorkspaceFolders).to.exist;
            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                true
            );

            await onDidChangeWorkspaceFolders({
                added: [],
                removed: [vscode.workspace.workspaceFolders![0]]
            });

            expect(executeCommand).to.have.been.calledWith(
                'setContext',
                'gitweblinks:canCopy',
                false
            );
        });
    });
});
