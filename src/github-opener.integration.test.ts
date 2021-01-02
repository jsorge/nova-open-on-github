import test from "ava";
import { capture, deepEqual, instance, mock, verify, when } from "ts-mockito";

import { integrationContainer } from "./containers/integration";
import { UrlOpener } from "./url_actions/url_opener";
import { ExtensionConfig } from "./extension_config/extension_config";
import { IdeContext } from "./ide_context/ide_context";
import { ProcessRunner } from "./process_runner/process_runner";
import { GithubOpener } from "./github-opener";

// Get origin URL
// git config --get remote.origin.url

test("Integration: GithubOpener given a file under source control opens it on github", (t) => {
  // Mock state
  const gitBinary = "/usr/bin/git";
  const currentGitRoot = "/Users/cool-guy/nice-project";
  const currentRelativeFileDir = "sub/dir";
  const currentRelativeFileName = "whatever.json";
  const currentFilePath = `${currentGitRoot}/${currentRelativeFileDir}/${currentRelativeFileName}`;
  const gitOrigin = "git@github.com:cool-guy/nice-project.git";

  const mockIdeContext = mock<IdeContext>();
  when(mockIdeContext.getCurrentFile()).thenReturn(currentFilePath);
  integrationContainer.register("ideContext", {
    useValue: instance(mockIdeContext),
  });

  const mockProcessRunner = mock<ProcessRunner>();
  when(
    mockProcessRunner.runCommand(
      gitBinary,
      deepEqual(["rev-parse", "--show-toplevel"]),
      `${currentGitRoot}/${currentRelativeFileDir}`
    )
  ).thenReturn(currentGitRoot);
  when(
    mockProcessRunner.runCommand(
      gitBinary,
      deepEqual(["config", "--get", "remote.origin.url"]),
      `${currentGitRoot}/${currentRelativeFileDir}`
    )
  ).thenReturn(gitOrigin);
  integrationContainer.register("processRunner", {
    useValue: instance(mockProcessRunner),
  });

  const mockUrlOpener = mock<UrlOpener>();
  integrationContainer.register("urlOpener", {
    useValue: instance(mockUrlOpener),
  });

  const mockExtensionConfig = mock<ExtensionConfig>();
  when(mockExtensionConfig.getGitBinaryPath()).thenReturn(gitBinary);
  integrationContainer.register("extensionConfig", {
    useValue: instance(mockExtensionConfig),
  });

  const githubOpener = integrationContainer.resolve(GithubOpener);
  githubOpener.openCurrentFileOnGithub();

  const expectedUrl = `https://github.com/cool-guy/nice-project/blob/master/${currentRelativeFileDir}/${currentRelativeFileName}`;

  console.log(capture(mockUrlOpener.openUrl).last());
  verify(mockUrlOpener.openUrl(expectedUrl)).once();

  t.pass();
});
