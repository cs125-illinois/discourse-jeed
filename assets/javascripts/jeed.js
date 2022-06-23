"use strict";

(function ($) {
  console.log("Jeed loaded");
  function runWithJeed(server, snippet, language, checkstyle) {
    var tasks = { execute: true };
    if (language === "java") {
      tasks.compile = true;
      tasks.checkstyle = checkstyle;
    } else if (language === "kotlin") {
      tasks.kompile = true;
    } else {
      throw Error("Invalid Jeed language " + language);
    }
    var request = {
      label: "",
      snippet: snippet + "\n",
      arguments: {
        snippet: {
          indent: 2
        },
        checkstyle: {
          failOnError: true
        }
      }
    };
    request.tasks = Object.keys(tasks);
    return $.ajax({
      url: server,
      type: "POST",
      data: JSON.stringify(request),
      contentType: "application/json; charset=utf-8",
      xhrFields: { withCredentials: true },
      crossDomain: true,
      dataType: "json"
    });
  }

  function formatJeedResult(result) {
    var request = result.request;
    var resultOutput = "";
    if (result.failed.snippet) {
      var errors = result.failed.snippet.errors;

      resultOutput += errors.map(function (error) {
        var line = error.line,
            column = error.column,
            message = error.message;

        var originalLine = request.snippet.split("\n")[line - 1];
        return "Line " + line + ": error: " + message + "\n" + originalLine + "\n" + new Array(column).join(" ") + "^";
      }).join("\n");

      var errorCount = Object.keys(errors).length;
      resultOutput += "\n" + errorCount + " error" + (errorCount > 1 ? "s" : "");
    } else if (result.failed.compilation || result.failed.kompilation) {
      var _ref = result.failed.compilation || result.failed.kompilation,
          _errors = _ref.errors;

      resultOutput += _errors.map(function (error) {
        var location = error.location,
            message = error.message;

        if (location) {
          var source = location.source,
              line = location.line,
              column = location.column;

          var originalLine = source === "" ? request.snippet.split("\n")[line - 1] : request.sources[0].contents.split("\n")[line - 1];
          var firstErrorLine = error.message.split("\n").slice(0, 1).join("\n");
          var restError = error.message.split("\n").slice(1).filter(function (errorLine) {
            if (source === "" && errorLine.trim().startsWith("location: class")) {
              return false;
            } else {
              return true;
            }
          }).join("\n");
          return "" + (source === "" ? "Line " : source + ":") + line + ": error: " + firstErrorLine + "\n  " + originalLine + "\n  " + new Array(column).join(" ") + "^\n  " + restError;
        } else {
          return message;
        }
      }).join("\n");
      var _errorCount = Object.keys(_errors).length;
      resultOutput += "\n" + _errorCount + " error" + (_errorCount > 1 ? "s" : "");
    } else if (result.failed.checkstyle) {
      var _errors2 = result.failed.checkstyle.errors;

      resultOutput += _errors2.map(function (error) {
        var _error$location = error.location,
            source = _error$location.source,
            line = _error$location.line;

        return "" + (source === "" ? "Line " : source + ":") + line + ": checkstyle error: " + error.message;
      }).join("\n");
      var _errorCount2 = Object.keys(_errors2).length;
      resultOutput += "\n" + _errorCount2 + " error" + (_errorCount2 > 1 ? "s" : "");
    } else if (result.failed.execution) {
      if (result.failed.execution.classNotFound) {
        resultOutput += "Error: could not find class " + result.failed.execution.classNotFound.klass;
      } else if (result.failed.execution.methodNotFound) {
        resultOutput += "Error: could not find method " + result.failed.execution.methodNotFound.method;
      } else {
        resultOutput += "Something went wrong...";
      }
    }

    if (Object.keys(result.failed).length === 0) {
      if (result.completed.execution) {
        var execution = result.completed.execution;

        var executionLines = execution.outputLines.map(function (outputLine) {
          return outputLine.line;
        });
        if (execution.threw) {
          executionLines.push(execution.threw.stacktrace);
        }
        if (execution.timeout) {
          executionLines.push("(Program Timed Out)");
        }
        if (execution.truncatedLines > 0) {
          executionLines.push("(" + execution.truncatedLines + " lines were truncated)");
        }
        resultOutput += executionLines.join("\n");
      }
    }
    return resultOutput.trim();
  }

  var defaultCloseButton = '<button class="jeed close" style="position: absolute; right: 2px; top: 2px;">Close</button>';
  var defaultRunButton = '<button class="jeed play" style="position: absolute; right: 2px; bottom: 2px;">Run</button>';
  var defaultRunningBanner = '<div class="jeed running" style="display: none;"><pre>Running...</pre></div>';

  $.fn.jeed = function (server) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    this.each(function (index, elem) {
      if ($(elem).children("code").length !== 1) {
        return;
      }
      var code = $(elem).children("code").eq(0);
      if (!(code.hasClass("lang-java") || code.hasClass("lang-kotlin"))) {
        return;
      }

      var language = void 0;
      if (code.hasClass("lang-java")) {
        language = "java";
      } else if (code.hasClass("lang-kotlin")) {
        language = "kotlin";
      }

      $(elem).css({ position: "relative" });

      var outputWrapper = $('<div class="jeed output" style="position: relative;"><pre></pre></div>').css({
        display: "none"
      });
      var runningBanner = $(options.runningBanner || defaultRunningBanner);
      outputWrapper.append(runningBanner);

      var closeButton = $(options.closeButton || defaultCloseButton).on("click", function () {
        $(this).parent().css({ display: "none" });
      });
      outputWrapper.append(closeButton);

      var output = $(outputWrapper).children("pre").eq(0);
      output.css({ display: "none" });

      var checkstyle = options.checkstyle || false;
      var timer = void 0;
      var runButton = $(options.runButton || defaultRunButton).on("click", function () {
        $(output).text("");
        timer = setTimeout(function () {
          $(outputWrapper).css({ display: "block" });
          runningBanner.css({ display: "block" });
        }, 100);
        runWithJeed(server, $(this).prev("code").text(), language, checkstyle).done(function (result) {
          $(outputWrapper).css({ display: "block" });
          var jeedOutput = formatJeedResult(result);
          if (jeedOutput !== "") {
            $(output).text(formatJeedResult(result));
          } else {
            $(output).html('<span class="jeed blank">(No output produced)</span>');
          }
          clearTimeout(timer);
          output.css({ display: "block" });
          runningBanner.css({ display: "none" });
        }).fail(function (xhr, status, error) {
          console.error("Request failed");
          console.error(JSON.stringify(xhr, null, 2));
          console.error(JSON.stringify(status, null, 2));
          console.error(JSON.stringify(error, null, 2));
          $(output).html('<span class="jeed error">An error occurred</span>');
          clearTimeout(timer);
          output.css({ display: "block" });
          runningBanner.css({ display: "none" });
        });
      });

      $(elem).append(runButton);
      $(elem).append(outputWrapper);
    });
  };
})(jQuery);
