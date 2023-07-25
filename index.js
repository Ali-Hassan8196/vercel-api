const { App, LogLevel } = require("@slack/bolt");
const { WebClient } = require("@slack/web-api");
require("dotenv").config();

const webClient = new WebClient(process.env.SLACK_OUTH_TOKEN);

const app = new App({
  // socketMode:true,
  appToken: process.env.APP_TOKEN,
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

(async () => {
  await app.start(process.env.PORT || 5000);
  console.log("Hello World.. Bolt app is running!");
})();

app.event("app_home_opened", async ({ event, say, client, view }) => {
  console.log(
    "Hello! Someone just opened the app to DM so we will send them a message!"
  );
  say(`Hello world and <@${event.user}>! `);

  try {
    await client.views.publish({
      user_id: event.user,

      view: {
        type: "home",
        callback_id: "home_view",

        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Welcome to your _App's Home_* :tada:",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This button won't do much for now, but you can set up a listener for it using the `actions()` method and passing its unique `action_id`. See an example in the `examples` folder within your Bolt app.",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "Click me!",
                },
                action_id: "button",
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error(error);
  }
});

app.action("button", async ({ ack, body, client }) => {
  console.log(body);
  try {
    await ack();

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: {
        type: "home",
        callback_id: "home_view",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "`THE BUTTON WAS CLICKED` :white_check_mark: ",
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error(error);
  }
});

app.command("/bywhen", async ({ ack, body, client, logger }) => {
  try {
    await ack();
    const result = await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "view_1",
        title: {
          type: "plain_text",
          text: "Create a Reminder",
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Please provide the details for the reminder:",
            },
          },
          {
            type: "input",
            block_id: "input_when",
            label: {
              type: "plain_text",
              text: "When?",
            },
            element: {
              type: "datepicker",
              action_id: "when_input",
            },
          },
          {
            type: "input",
            block_id: "input_time",
            label: {
              type: "plain_text",
              text: "Time?",
            },
            element: {
              type: "static_select",
              action_id: "time_input",
              options: generateTimeOptions(),
            },
          },
          {
            type: "input",
            block_id: "input_description",
            label: {
              type: "plain_text",
              text: "Description",
            },
            element: {
              type: "plain_text_input",
              action_id: "description_input",
              multiline: true,
            },
          },
        ],
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
    logger.info(result);
    logger.info(result.view.id);
  } catch (error) {
    logger.error(error);
  }
});

app.view("view_1", async ({ ack, body, client, logger }) => {
  console.log("submit");
  try {
    await ack();

    const whenInput =
      body.view.state.values.input_when.when_input.selected_date;
    const timeInput =
      body.view.state.values.input_time.time_input.selected_option.value;
    const descriptionInput =
      body.view.state.values.input_description.description_input.value;
    const user_id = body.user.id;

    const formattedReminderTime = `${whenInput} ${timeInput}`;

    const reminderMessage = `Reminder: ${descriptionInput}\nWhen: ${whenInput} at ${timeInput}`;

    await webClient.reminders.add({
      text: reminderMessage,
      time: formattedReminderTime,
      user: user_id,
    });

    await client.chat.postMessage({
      channel: user_id,
      text: `Reminder set!\n${reminderMessage}`,
    });

    logger.info(`Reminder set for user ${user_id}: ${reminderMessage}`);
  } catch (err) {
    logger.error("error is", err);
  }
});

function generateTimeOptions() {
  const options = [];
  const timeFormat = "h:mm A";
  const currentTime = new Date();

  currentTime.setHours(0);
  currentTime.setMinutes(0);

  const endTime = new Date(currentTime);
  endTime.setHours(23);
  endTime.setMinutes(45);

  while (currentTime <= endTime) {
    options.push({
      text: {
        type: "plain_text",
        text: currentTime.toLocaleTimeString("en-US", { timeStyle: "short" }),
      },
      value: currentTime.toLocaleTimeString("en-US", {
        timeStyle: "short",
        hour12: true,
      }),
    });
    currentTime.setMinutes(currentTime.getMinutes() + 15);
  }

  return options;
}


module.exports = async (req, res) => {
  try {

    if (req.method === "POST") {
      const body = JSON.parse(req.body);
      if (body.type === "url_verification") {
        res.setHeader("Content-Type", "application/json");
        res.status(200).json({ challenge: body.challenge });
      } else {
        await app.processEvent(body);
        res.status(200).end();
      }
    } else {
      res.status(404).end();
    }
  } catch (error) {
    console.error("Error handling Slack request:", error);
    res.status(500).end();
  }
};
