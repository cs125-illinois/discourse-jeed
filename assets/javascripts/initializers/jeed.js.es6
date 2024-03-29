import { withPluginApi } from "discourse/lib/plugin-api";
import { iconHTML } from "discourse-common/lib/icon-library";
import initJeed from "../lib/jeed";

const runButton =
  '<button class="jeed play widget-button btn btn-default no-text btn-icon" style="position: relative; float: right; top: -32px; margin-bottom: -32px;">' + iconHTML('play-circle') + '</button>';
const closeButton =
  '<button class="jeed play widget-button btn btn-small no-text btn-icon" style="position: absolute; right: 2px; top: 2px;">' + iconHTML('close') + '</button>';

export default {
  name: "apply-jeed",
  initialize() {
    withPluginApi("0.1", api => {
      initJeed($);
      api.decorateCooked(
        $elem => {
          const siteSettings = api.container.lookup("site-settings:main");
          const server = siteSettings.jeed_backend
          if (server === "") {
            console.warn("Jeed Backend site settings must be set!")
            return
          }
          const checkstyle = siteSettings.jeed_checkstyle
          $("pre", $elem).jeed(server, { runButton, closeButton, checkstyle })
        },
        { id: "discourse-jeed" }
      );
    });
  }
};
