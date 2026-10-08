const geminiAPIKey = PropertiesService.getScriptProperties().getProperty("geminiAPIKey")
const mataroaAPIKey = PropertiesService.getScriptProperties().getProperty("mataroaAPIKey")
const emailToSendTo = PropertiesService.getScriptProperties().getProperty("emailToSendTo")
const jevAPIKey = PropertiesService.getScriptProperties().getProperty("jevAPIKey")
const SPAM_THRESHOLD = 0.8;
const ENGLISH_THRESHOLD = 0.2;


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

  const isSpam = jevModerateComment(commentContent,postTitle);

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

function createModerationState(comment, postTitle) {
  return `Blog post title: "${postTitle}"\n\nComment:\n${comment}`
}

function jevModerateComment(comment,postTitle) {
  const data = {
    model: "jev-latest",
    state: createModerationState(comment, postTitle),
    questions: {
      is_spam: {
        type: "noul",
        instructions:"Is this blog comment spam?",
      },
      is_english:{
        type: "noul",
        instructions: "Is the comment written in English?"
      }
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${jevAPIKey}` },
    payload: JSON.stringify(data),
    muteHttpExceptions:true
  };

  const response = UrlFetchApp.fetch("https://api.typesafe.ai/v1/systemone",options);
  const code = response.getResponseCode();
  if (code!==200) {
    console.error(`Jev error ${code}: ${response.getContentText()}`);
    return false;
  }

  const answers = JSON.parse(response.getContentText()).answers;
  const pSpam = answers.is_spam.noul;
  const pEnglish = answers.is_english.noul;
  console.log(`P(spam)=${pSpam.toFixed(3)} P(english)=${pEnglish.toFixed(3)} for "${comment.slice(0, 60)}"`);

  return pSpam >= SPAM_THRESHOLD || pEnglish < ENGLISH_THRESHOLD;
}
