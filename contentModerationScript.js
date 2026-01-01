const geminiAPIKey = PropertiesService.getScriptProperties().getProperty("geminiAPIKey")
const mataroaAPIKey = PropertiesService.getScriptProperties().getProperty("mataroaAPIKey")
const emailToSendTo = PropertiesService.getScriptProperties().getProperty("emailToSendTo")

function firstPassOnComment() {
  const threads = GmailApp.search('from:notifications@mataroa.blog');
  threads.forEach(emailThread => {
    messages = emailThread.getMessages()
    messages.forEach(email => {
          processEmail(email);
    })

  })
}

async function processEmail(email) {
  const commentContent = getCommentContent(email)
  const postTitle = getPostTitle(email)
  const commentID = getCommentIDFromEmail(email);

  const isSpam = moderateComment(commentContent,postTitle);

  if (isSpam) {
    deleteComment(commentID);
    console.log(`deleted comment ${commentID}`)
    email.moveToTrash();
  } else {
    console.log(`WILL FORWARD to personal email ${commentID}`);
    email.forward(emailToSendTo);
    email.moveToTrash();
  }
}

function getCommentIDFromEmail(email) {
  const body = email.getBody();
  let parts = body.split("/")

  return parts[parts.length-3];
}

function deleteComment(id) {
  const commentURL = `https://mataroa.blog/api/comments/${id}/`

  let response = UrlFetchApp.fetch(commentURL, {
    method: 'delete',
    'headers': {
      'Authorization': `Bearer ${mataroaAPIKey}`
    },
  });
}

function getCommentContent(email) {
  const body = email.getBody()
  const startOfCommentIndex = body.indexOf("Comment follows:") + 20
  const endOfCommentIndex = body.length - body.split("").reverse().join("").lastIndexOf("---") - 4
  const comment = body.substring(startOfCommentIndex,endOfCommentIndex)

  return comment;
}

function getPostTitle(message) {
  const body = message.getBody();
  const startMarker = "Someone commented on your post: ";
  const startIndex = body.indexOf(startMarker) + startMarker.length;
  const endIndex = body.indexOf("This comment is pending review");
  const title = body.substring(startIndex, endIndex).trim();
  return title;
}

function createModerationPrompt(comment, postTitle) {
  const prompt = `${comment} \n\n --- \n The text above is a comment for a blog post called "${postTitle}." Please classify whether it is a spam comment. Comments should be in English and should not appear to be selling a service or encouraging the user to click on a (sketchy) link. If unsure, err on the side of classifying a comment not-spam; if you mark a comment as not-spam, a human will review your result.`

  return prompt
}

function moderateComment(comment, postTitle) {
  prompt = createModerationPrompt(comment, postTitle);

  data = {
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": prompt
          },
        ]
      },
    ],
    "generationConfig": {
      "thinkingConfig": {
        "thinkingBudget": -1,
      },
      "responseMimeType": "application/json",
      "responseSchema": {
          "type": "object",
          "properties": {
            "is_spam": {
              "type": "boolean"
            }
          },
          "required": [
            "is_spam"
          ],
          "propertyOrdering": [
            "is_spam"
          ]
        },
    },
  }

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(data)
  }
  
  const MODEL_ID = "gemini-3-flash-preview"
  const GENERATE_CONTENT_API = "generateContent"
  let response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:${GENERATE_CONTENT_API}?key=${geminiAPIKey}`, options);

  const payload = JSON.parse(response.getContentText());

  const text = payload.candidates[0].content.parts[0].text;

  const judgement = JSON.parse(text).is_spam

  return judgement
}