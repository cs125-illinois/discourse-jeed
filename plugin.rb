# frozen_string_literal: true

# name: discourse-jeed
# about: Discourse support for turning fenced code blocks into playgrounds backed by Jeed.
# version: 0.1
# authors: Geoffrey Challen

enabled_site_setting :jeed_enabled
hide_plugin if self.respond_to?(:hide_plugin)
register_svg_icon "play-circle" if respond_to?(:register_svg_icon)
register_svg_icon "close" if respond_to?(:register_svg_icon)

# javascript
# register_asset "javascripts/jeed.js"

# stylesheet
register_asset "stylesheets/jeed.css"
