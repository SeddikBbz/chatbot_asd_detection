// Make sure the server-side session is actually destroyed on logout,
// instead of just navigating away and leaving the cookie/session alive.
document.addEventListener('DOMContentLoaded', function () {
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', function (event) {
      event.preventDefault();
      fetch('/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/signup';
      });
    });
  }
});

const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const form = document.getElementById('chat-form');
const loader = document.getElementById('loader');
// Variable to store the start time ,user ID
let startTime;
let userId;
let currentConversationId;
let currentConversationId1;
let curentchildid;


function copyCodeToClipboard(copyButton) {
  try {
    const codeContent = document.querySelector('.code-card pre code').innerText; // Get the text content of the code element
    navigator.clipboard.writeText(codeContent) // Write the text content to the clipboard
      .then(() => {

        copyButton.innerHTML = `
                        <svg width="24" height="24" style="background=black;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 14L5 9L6.41 7.59L10 11.17L17.59 3.58L19 5L10 14Z" fill="currentColor"/>
                        </svg>
                    `;
      })
      .catch((error) => {
        console.error('Error copying code to clipboard:', error);

      });
  } catch (error) {
    console.error('Error selecting code content:', error);

  }
}
// Function to handle termination of chat
async function terminateChat() {
  try {
    const endTime = new Date().toISOString(); // Get current timestamp as the end time

    // Make a POST request to the server to terminate the chat
    const response = await fetch('/terminateChat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ endTime })
    });

    // Check if the response is successful
    if (response.ok) {
      // Redirect to the signup page after successful chat termination
      window.location.href = '/signup';
    } else {
      console.error('Error terminating chat:', response.statusText);
      // Handle the error if needed
    }
  } catch (error) {
    console.error('Error terminating chat:', error);
    // Handle the error if needed
  }
}
window.addEventListener('beforeunload', function (event) {
  // Call the terminateChat function here to end the chat session
  terminateChat();
});
// Event listener for form submission
form.addEventListener('submit', (event) => {
  event.preventDefault(); // Prevent form submission
  loader.style.display = 'block'; // Show the loader

  // Store start time when sending a message
  startTime = new Date().toISOString();

  sendMessage();
});
const newChatButton = document.getElementById("new-chat-btn");
// Event listener to reload the page when the new chat button is clicked
newChatButton.addEventListener("click", async function () {
  try {
    const startTime = new Date().toISOString();
    // Insert conversation into database
    console.log(startTime);
    const insertResponse = await fetch('/createConversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startTime: startTime,
        endTime: '',
        userInput: '', // Assuming there's no user input for a new chat
        botResponse: '' // Assuming there's no bot response for a new chat
      }),
    });
    if (!insertResponse.ok) {
      throw new Error('Failed to insert conversation into database');

    }
    const insertData = await insertResponse.json();
    console.log(insertData);

  } catch (error) {
    console.error('Error inserting conversation into database:', error);
    // Handle error gracefully if needed
  }
});
document.addEventListener('DOMContentLoaded', (event) => {
  const toggleLeft = document.getElementById("toggle-left");
  const toggleRight = document.getElementById("toggle-right");
  const leftSidebar = document.getElementById("left-sidebar");
  const rightSidebar = document.getElementById("right-sidebar");
  const content = document.getElementById("content");

  toggleLeft.addEventListener("click", function () {
      leftSidebar.classList.toggle("expand");
      if (leftSidebar.classList.contains("expand")) {
          content.style.marginLeft = '260px';
      } else {
          content.style.marginLeft = '0';
      }
  });

  toggleRight.addEventListener("click", function () {
      rightSidebar.classList.toggle("expand");
      if (rightSidebar.classList.contains("expand")) {
          content.style.marginRight = '260px';
      } else {
          content.style.marginRight = '0';
      }
  });
});



// Close sidebar on small screens
function closeSidebarOnSmallScreens() {
  if (window.innerWidth < 576) {
    sidebar.classList.remove("expand");
    newChatButton.style.display = "none"; // Hide new chat button on small screens
    // Hide the scrollbar of the child list on small screens
    childList.style.overflowY = 'hidden';
  }
}

// Close sidebar on page load if screen width is small
closeSidebarOnSmallScreens();

// Close sidebar on window resize
window.addEventListener("resize", closeSidebarOnSmallScreens);


async function fetchConversations() {
  try {
    const response = await fetch('/conversations');
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    const conversations = await response.json();
    displayConversations(conversations); // Display the conversations on the UI

    // Fetch and display messages for each conversation
    for (const conversation of conversations) {
      await fetchAndDisplayMessages(conversation.conversation_id); // Pass conversation ID as parameter
    }

    return conversations;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}
const conversationMessages = {};

async function fetchAndDisplayMessages(conversationId) {
  try {
    const response = await fetch(`/messages?conversationId=${conversationId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch messages for conversation ${conversationId}`);
    }
    const messages = await response.json();

    // Store messages in the conversationMessages object
    conversationMessages[conversationId] = messages;

  } catch (error) {
    console.error('Error fetching messages for conversation', conversationId, ':', error);
    throw error;
  }
}

// Example usage:
fetchConversations()
  .then(conversations => {

  })
  .catch(error => {
    // Handle errors
    // For example, display an error message to the user
  });
let favoriteid;
function displayConversations(conversations) {
  const conversationList = document.getElementById('conversation-list');
  conversationList.innerHTML = ''; // Clear previous conversations

  let currentDate = null; // Variable to keep track of the current date
  const dateFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }; // Date formatting options

  // Function to generate conversation titles
  function generateConversationTitle(index) {
    return `Conversation ${index + 1}`; // Add 1 to the index to start from 1 instead of 0
  }

  let index = -1; // Initialize index variable

  conversations.forEach(conversation => {
    const conversationDateTime = new Date(conversation.start_time); // Get the conversation date and time
    const dateString = conversationDateTime.toLocaleDateString(undefined, dateFormatOptions); // Format date as DD/MM/YYYY

    // If the conversation date is different from the current date, add a hint
    if (conversationDateTime.toDateString() !== currentDate) {
      const dateHint = document.createElement('li');
      dateHint.textContent = dateString;
      dateHint.style.color = 'rgb(90, 87, 87';
      dateHint.classList.add('conversation-date-hint');
      conversationList.appendChild(dateHint);
      currentDate = conversationDateTime.toDateString(); // Update the current date
      index = 0; // Reset index for each new date
    }

    // Create and append the conversation item
    const conversationItem = document.createElement('li');
    const conversationTitle = generateConversationTitle(index++);
    conversationItem.textContent = `${conversationTitle} `;
    conversationItem.classList.add('conversation-item'); // Add class to style conversation item

    // Apply styles to conversation item
    conversationItem.style.maxHeight = '300px';
    conversationItem.style.overflowY = 'auto';
    conversationItem.style.borderRadius = '10px';
    conversationItem.style.position = 'relative';
    conversationItem.style.color = '#ffffff';


    // Style the scrollbar
    conversationItem.style.scrollbarWidth = 'thin';

    // For Firefox
    conversationItem.style.webkitScrollbarWidth = '10px';
    conversationItem.style.webkitScrollbarTrack = '#2A9D8F';
    conversationItem.style.webkitScrollbarThumb = '#1b7066';
    conversationItem.style.webkitScrollbarThumbHover = '#ebe3e3';

    conversationItem.style.marginBottom = '5px'; // Adjust margin if needed
    conversationItem.style.padding = '5px 10px'; // Adjust padding if needed

    // Append the conversation item to the conversation list
    conversationList.appendChild(conversationItem);

    // Create star icon for marking as favorite
    const starIcon = document.createElement('span');
    starIcon.textContent = '☆';// Unicode character for a star
    starIcon.style.color = '#ffffff';
    starIcon.classList.add('favorite-icon'); // Add class for styling

    let lastClickTime = 0;

    // Function to handle toggling favorite state and sending fetch request
    async function toggleFavorite(event) {
      const currentTime = new Date().getTime();
      const starIcon = event.currentTarget;

      // Check for double click
      if (currentTime - lastClickTime < 300 && starIcon.classList.contains('favorite')) {
        // Double click detected on a favorite star, unmark it
        starIcon.classList.remove('favorite');
        starIcon.style.color = 'black'; // Change color to black
        await addFavorite(0); // Send 0 if un-favorited
      } else {
        // Single click or first click of double click
        starIcon.classList.toggle('favorite'); // Toggle favorite class
        if (starIcon.classList.contains('favorite')) {
          starIcon.style.color = 'yellow'; // Change color to yellow when marked as favorite
          await addFavorite(1); // Send 1 if favorited
        } else {
          starIcon.style.color = 'black'; // Change color back to black when unmarked
          await addFavorite(0); // Send 0 if un-favorited
        }
      }

      lastClickTime = currentTime;
    }

    // Add click event listener to the star icon
    starIcon.addEventListener('click', toggleFavorite);


    // Append star icon to conversation item
    conversationItem.appendChild(starIcon);

    // Append conversation item to conversation list
    conversationList.appendChild(conversationItem);


    // Retrieve messages for the conversation from the conversationMessages list
    const messages = conversationMessages[conversation.id] || []; // Retrieve messages or set to an empty array if none

    // Attach click event listener to each conversation item
    conversationItem.addEventListener('click', () => {
      // Extract conversation ID from the conversation object
      const conversationId = conversation.conversation_id || conversation.id;
      console.log('Clicked conversation ID:', conversationId);
      favoriteid = conversationId;
      // Retrieve messages for the clicked conversation
      const messages = conversationMessages[conversationId] || [];
      console.log('Messages for conversation:', messages);

      // Get a reference to the chat history container
      const chatHistory = document.getElementById('chat-history');

      // Clear previous messages
      chatHistory.innerHTML = '';

      // Iterate through each message
      messages.forEach(message => {
        // Create a message element
        const messageElement = document.createElement('div');

        // Apply common styling for both user and bot messages
        messageElement.classList.add('msg_cotainer');

        // Check if the message is a code
        if (message.sender === 'bot') {
          const data = { response: message.message_content }; // Assuming message_content contains the bot's response
          if (data && data.response) {
            // Extract code content from within triple backticks
            const codeMatch = data.response.match(/^```([\s\S]*?)```$/);
            if (codeMatch) {
              // Apply code styling
              messageElement.classList.add('code-message');

              // Generate the code card HTML
              const code = codeMatch[1]; // Extract content between triple backticks
              messageElement.innerHTML = `
                                <div class="code-card" style="position: relative; width: 100%; border-radius: 5px; background: linear-gradient(to right, rgb(156, 236, 243), rgb(119, 217, 241), rgb(92, 215, 240)); margin-bottom: 10px; margin-top: 20px;">
                                <span class="" data-state="closed" style="position: absolute; top: -30px; right: 0px;">
                                    <button onclick="copyCodeToClipboard(this)" class="flex gap-1 items-center" style="border-radius: 25px; color: black; width: fit-content; background: linear-gradient(to right, rgb(156, 236, 243), rgb(119, 217, 241), rgb(92, 215, 240));">
                                        <svg width="18" height="18" style="background=black;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C10.8954 3.5 10 4.39543 10 5.5H14C14 4.39543 13.1046 3.5 12 3.5ZM8.53513 3.5C9.22675 2.3044 10.5194 1.5 12 1.5C13.4806 1.5 14.7733 2.3044 15.4649 3.5H17.25C18.9069 3.5 20.25 4.84315 20.25 6.5V18.5C20.25 20.1569 19.1569 21.5 17.25 21.5H6.75C5.09315 21.5 3.75 20.1569 3.75 18.5V6.5C3.75 4.84315 5.09315 3.5 6.75 3.5H8.53513ZM8 5.5H6.75C6.19772 5.5 5.75 5.94772 5.75 6.5V18.5C5.75 19.0523 6.19772 19.5 6.75 19.5H17.25C18.0523 19.5 18.25 19.0523 18.25 18.5V6.5C18.25 5.94772 17.8023 5.5 17.25 5.5H16C16 6.60457 15.1046 7.5 14 7.5H10C8.89543 7.5 8 6.60457 8 5.5Z" fill="currentColor"></path>
                                        </svg>Copy code
                                    </button>
                                </span>
                                <pre style="margin: 0; overflow-x: auto; color: black; width: 100%"><code class="language-python">${code}</code></pre>
                            </div>
                            
                                `;
            } else {
              // Regular bot message
              // Set the message content for non-code messages
              messageElement.textContent = data.response;


              // Apply bot message styling
              messageElement.classList.add('bot-message');
            }
          }
        } else {
          // Set the message content for user messages
          messageElement.textContent = message.message_content;


          // Apply user message styling
          messageElement.classList.add('user-message');
        }

        // Append the message element to the chat history container
        chatHistory.appendChild(messageElement);
      });

    });

    conversationList.appendChild(conversationItem); // Append conversation item to the conversation list
  });
}

async function addFavorite(value) {
  console.log(value + ' -->' + favoriteid);
  try {
    const response = await fetch('/addFavorite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value, favoriteid })
    });
    if (!response.ok) {
      throw new Error('Failed to add favorite');
    }
    const data = await response.json();
    console.log(data); // Optional: Handle response data from the server
  } catch (error) {
    console.error('Error:', error);
    // Handle error gracefully
  }
}
// Add event listener to the "Your Child" button
document.getElementById("child-btn").addEventListener("click", function (event) {
  event.preventDefault(); // Prevent default behavior of anchor tag
  addNewChildItem();
});

// Function to add a new child item to the list
function addNewChildItem() {
  $('#childInfoModal').modal('show');
}

function saveChildInfo() {
  const childName = document.getElementById('childName').value;
  const childAge = parseInt(document.getElementById('childAge').value);

  if (childName && !isNaN(childAge)) {
    // Assuming you have a function to save the child's information to the database
    saveChildToDatabase(childName, childAge)
      .then(() => {
        // Assuming you have a function to update the UI with the new child item
        updateChildListUI(childName, childAge, curentchildid);
        // Close the modal after saving the child's information
        $('#childInfoModal').modal('hide');
        fetchConversationMessage(childName)
        // window.location.reload();
      })
      .catch(error => {
        console.error('Error saving child to database:', error);
        // Handle error if needed
      });
  }
}

function closeChildInfoModal() {
  $('#childInfoModal').modal('hide');
}
// Function to save the child's information to the database and create a new conversation
async function saveChildToDatabase(name, age) {
  try {
    const response = await fetch('/saveChild', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, age }),
    });

    if (!response.ok) {
      throw new Error('Failed to save child to the database');
    }

    const data = await response.json();
    console.log('Child saved to database:', data);

    // Assuming you have a function to create a new conversation for the child
    const conversationId = await createConversationForChild(data.childId); // Pass the child ID received from the response
    curentchildid = data.childId;
    console.log('Conversation created for the child');

    // Update the UI with the new conversation
    updateConversationListUI(conversationId);

  } catch (error) {
    console.error('Error saving child to database:', error);
    throw error;
  }
}
// Function to create a new conversation for the child
async function createConversationForChild(childId) {
  try {
    const response = await fetch('/createConversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ childId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation for the child');
    }

    const data = await response.json();
    console.log('Conversation created for the child:', data);

    // Make sure to include the conversationId in the response
    return data.conversationId; // Assuming 'conversationId' is the key for the conversationId in the response
  } catch (error) {
    console.error('Error creating conversation for the child:', error);
    throw error;
  }
}

// Function to update the sidebar with the new conversation
function updateConversationListUI(conversationId) {
  // Get the <ul> element with the id 'conversation-list'
  const conversationList = document.getElementById('conversation-list');

  // Clear the chat history
  const chatHistory = document.getElementById('chat-history');
  chatHistory.innerHTML = '';

  // Create a new <li> element to represent the conversation item
  const conversationItem = createConversationListItem(conversationId);

  // Append the new <li> element to the <ul> element
  conversationList.appendChild(conversationItem);
}

// Function to create a new conversation list item
function createConversationListItem(conversationId) {
  // Create a new <li> element
  const listItem = document.createElement('li');

  // Customize the content of the <li> element
  listItem.innerHTML = `
      <a href="#" style="display: flex; justify-content: center; margin-top: 5px; text-decoration: none; font-size: large;" class="sidebar-link">
          <span style="color: #ffffff; text-transform: uppercase;">Conversation ID: ${conversationId}</span>
      </a>
  `;

  // Return the created <li> element
  return listItem;
}

// Function to update the sidebar with the new child item
function updateChildListUI(name, age, id) {
  // Create a new <li> element to represent the child item
  const childItem = createChildListItem(name, age, id);

  // Get the <ul> element with the id 'child-list' where you want to append the new child item
  const childList = document.getElementById('child-list');

  // Append the new <li> element to the <ul> element
  childList.appendChild(childItem);
}

function updateChildListUI(name, age, id) {
  // Create a new <li> element to represent the child item
  const childItem = createChildListItem(name, age, id);

  // Get the <ul> element with the id 'child-list' where you want to append the new child item
  const childList = document.getElementById('child-list');

  // Append the new <li> element to the <ul> element
  childList.appendChild(childItem);
}

function createChildListItem(name, age, id) {
  // Create a new <li> element
  const listItem = document.createElement('li');

  // Assign the ID to the <li> element
  listItem.id = id;

  // Customize the content of the <li> element with the child's name, age, and ID
  listItem.innerHTML = `
    <a href="#" style="display: flex; justify-content: center; align-items: center; text-decoration: none; font-size: large; width: 100%; color: #ffffff; text-transform: uppercase;">
      ${name}
    </a>
  `;

  // Return the created <li> element
  return listItem;
}


async function fetchChildNames(userId) {
  try {
    const response = await fetch(`/getnames`);
    if (!response.ok) {
      throw new Error('Failed to fetch child names');
    }
    const userData = await response.json();
     // Assuming userData contains the necessary informationdocument.getElementById('userName').innerHTML = userData.username;
document.getElementById('userName').innerHTML = userData.user;
    const childNames = userData.childNames;
    console.log('Fetched Child Names:', childNames);
    displayChildNames(childNames); // Display the child names in the sidebar

    return childNames;
  } catch (error) {
    console.error('Error fetching child names:', error);
    throw error;
  }
}

let chidname1;
function displayChildNames(childNames) {
  const childList = document.getElementById('child-list');
  childList.innerHTML = ''; // Clear previous child names

  childNames.forEach(child => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
            <a href="#" style="display: flex;justify-content: flex-start;margin-top: 5px; text-decoration: none;font-size: large;" class="sidebar-link">
                <span style="color:#ffffff;text-transform:uppercase;margin-left:20px;">${child}</span>
            </a>
        `;
    listItem.classList.add('child-item');

    // Prevent the default behavior of the <a> tag
    listItem.addEventListener('click', event => {
      event.stopPropagation();
      chidname1 = child;
      // Prevent event propagation
      // Fetch and display the conversation message for the clicked child
      fetchConversationMessage(child);
    });

    childList.appendChild(listItem);
  });
}
function fetchConversationMessage(childName) {
  // Fetch conversation messages for the specified child
  fetch(`/getConversationMessage?childName=${childName}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch conversation message');
      }
      return response.json();
    })
    .then(data => {
      
      currentConversationId1 = data.conversationId;
      // Check if there are existing conversation messages for the child
      if (data.messages.length > 0) {
        // If there are existing messages, display them
        displayConversationMessage(data.messages);
        askNextQuestion(1);
      } else {
        // If there are no existing messages, prompt the user to start a new chat
        const confirmation = confirm('There are no existing messages for this child. Do you want to start a new chat?');
        if (confirmation) {
          chatHistory.innerHTML = '';
          askNextQuestion(1);
          // Make an AJAX request to the server to create a new conversation
          fetch('/createConversationChild', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, childId }),
          })
            .then(response => response.json())
            .then(data => {
              if (data.error) {
                alert('Error creating conversation: ' + data.error);
              } else {
                console.log('Conversation created successfully:', data);
                // Clear previous messages
                const chatHistory = document.getElementById('chat-history');
                console.log("2024-*-*-*-*-")

              }
            })
            .catch(error => {
              console.error('Error:', error);
              alert('Error creating conversation');
            });
        }
      }
    })
    .catch(error => {
      console.error('Error fetching conversation message:', error);
      // Handle error if needed
    });
}

async function savemessage(userInput) {
  try {
    // Call the /chatchild endpoint with the user input
    const chatResponse = await fetch('/chatchild', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: userInput,
      }),
    });
    if (!chatResponse.ok) {
      throw new Error('Failed to send user input');
    }
    const chatData = await chatResponse.json();
    console.log(chatData);

    // Optionally, you can handle the response data here if needed

  } catch (error) {
    console.error('Error saving message:', error);
    // Handle error gracefully if needed
  }
}

async function startNewChat() {
  try {
    const startTime = new Date().toISOString();
    // Insert conversation into database
    console.log(startTime);
    const insertResponse = await fetch('/createConversationchild', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startTime: startTime
      }),
    });
    if (!insertResponse.ok) {
      throw new Error('Failed to insert conversation into database');
    }
    const insertData = await insertResponse.json();
    console.log(insertData);

    // Get user input from the input field
    const userInput = document.getElementById('user-input').value;

    // Call the savemessage function to send the user input to the server
    await savemessage(userInput);

    // Reload the page or perform any necessary UI updates

  } catch (error) {
    console.error('Error starting new chat:', error);
    // Handle error gracefully if needed
  }
}

function displayConversationMessage(messages) {
  // Get the chat history container
  const chatHistory = document.getElementById('chat-history');

  // Clear existing messages
  chatHistory.innerHTML = '';
  messages.forEach(message => {
    // Create a message element
    const messageElement = document.createElement('div');

    // Apply common styling for both user and bot messages
    messageElement.classList.add('msg_cotainer');

    // Check if the message is a code
    if (message.sender === 'bot') {
      const data = { response: message.message_content }; // Assuming message_content contains the bot's response
      if (data && data.response) {
        // Extract code content from within triple backticks
        const codeMatch = data.response.match(/^```([\s\S]*?)```$/);
        if (codeMatch) {
          // Apply code styling
          messageElement.classList.add('code-message');

          // Generate the code card HTML
          const code = codeMatch[1]; // Extract content between triple backticks
          messageElement.innerHTML = `
                                                <div class="code-card" style="position: relative; width: 100%; border-radius: 5px; background: linear-gradient(to right, rgb(156, 236, 243), rgb(119, 217, 241), rgb(92, 215, 240)); margin-bottom: 10px; margin-top: 20px; padding: 10px; color: #4A4A4A;">
                                                    <span data-state="closed" style="position: absolute; top: -30px; right: 0px;">
                                                        <button onclick="copyCodeToClipboard(this)" class="flex gap-1 items-center" style="border-radius: 25px; color: black; width: fit-content; background: linear-gradient(to right, rgb(156, 236, 243), rgb(119, 217, 241), rgb(92, 215, 240));">
                                                            <svg width="18" height="18" style="background: black;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm">
                                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C10.8954 3.5 10 4.39543 10 5.5H14C14 4.39543 13.1046 3.5 12 3.5ZM8.53513 3.5C9.22675 2.3044 10.5194 1.5 12 1.5C13.4806 1.5 14.7733 2.3044 15.4649 3.5H17.25C18.9069 3.5 20.25 4.84315 20.25 6.5V18.5C20.25 20.1569 19.1569 21.5 17.25 21.5H6.75C5.09315 21.5 3.75 20.1569 3.75 18.5V6.5C3.75 4.84315 5.09315 3.5 6.75 3.5H8.53513ZM8 5.5H6.75C6.19772 5.5 5.75 5.94772 5.75 6.5V18.5C5.75 19.0523 6.19772 19.5 6.75 19.5H17.25C18.0523 19.5 18.25 19.0523 18.25 18.5V6.5C18.25 5.94772 17.8023 5.5 17.25 5.5H16C16 6.60457 15.1046 7.5 14 7.5H10C8.89543 7.5 8 6.60457 8 5.5Z" fill="currentColor"></path>
                                                            </svg>Copy code
                                                        </button>
                                                    </span>
                                                    <pre style="margin: 0; overflow-x: auto; color: black; width: 100%;"><code class="language-python">${code}</code></pre>
                                                </div>
                                            `;

        } else {
          // Regular bot message
          // Set the message content for non-code messages
          messageElement.textContent = data.response;


          // Apply bot message styling
          messageElement.classList.add('bot-message');
        }
      }
    } else {
      // Set the message content for user messages
      messageElement.textContent = message.message_content;


      // Apply user message styling
      messageElement.classList.add('user-message');
    }

    // Append the message element to the chat history container
    chatHistory.appendChild(messageElement);
  });
}

const questions = [
  {
    question:
      "Child’s Age: used for score calculation as degree of symptoms vary with age",
    choices: [
      "2 years old",
      "3 years old",
      "4 years old",
      "5 years old",
      "I prefer not to enter my Child’s age (note: this may result in slightly lesser score accuracy)",
    ],
  },
  {
    question:
      "Have you or your child been diagnosed with any medical conditions?",
    choices: ["Yes", "No"],
  },
  {
    question: "Do you or your child have any allergies?",
    choices: ["Yes", "No", "I'm not sure"],
  },
  {
    question: "Your toddler usually looks at you when you call his/her name",
    choices: ["Always. ", "Sometimes. ", "Usually ", "Rarely.", "Never. "],
  },
  {
    question:
      "Your toddler usually makes eye contact when engaged in a conversation",
    choices: ["Always. ", "Mostly ", "Sometimes ", "Rarely. ", "Never. "],
  },
  {
    question:
      "How long do you think your toddler usually spends looking at a spinning object?",
    choices: [
      "Several hours a day ",
      "More than 30 mins a day ",
      "Approx 10 to 15 minutes ",
      "Approx 2 to 5 minutes ",
      "Hardly ",
    ],
  },
  {
    question:
      "If you point at something, your toddler is usually able to follow where you are looking at, or what you are pointing to",
    choices: [
      "Several times a day ",
      "Only few times a day ",
      "Several times a week. ",
      "Less than 5 times a week ",
      "Hardly ever ",
    ],
  },
  {
    question:
      "Does your toddler make unusual finger movements in front of his/her eyes?",
    choices: [
      "Very Frequently ",
      "Many times during the day ",
      "Sometimes ",
      "Rarely ",
      " Never ",
    ],
  },
  {
    question: "How would you rate your child’s sensitivity to noise?",
    choices: ["Excited ", "Happy ", "Natural ", "Sad. ", "Grumpy "],
  },
  {
    question:
      "Your toddler points at things to share that she/he might find interesting for example a puppy, fireworks or an interesting event",
    choices: [
      "Several times a day ",
      "Only few times a day ",
      "Several times a week. ",
      "Less than 5 times a week ",
      "Hardly ",
    ],
  },
  {
    question:
      "Your toddler can usually understand if you, or someone in the immediate family (your partner, siblings, etc) are visibly upset and she/he attempts to comfort you (or the other member) for example, by throwing a hug or stroking your (or the other family member’s) hair, etc",
    choices: ["Always.", "Mostly", "Sometimes", "Rarely.", "Never."],
  },
  {
    question:
      "Your toddler is usually good at interpreting simple gestures and would return the same for example waving bye, or saying hello/hi, etc",
    choices: [
      "Several times a day",
      "Only few times a day",
      "Several times a week",
      "Less than 5 times a week.",
      "Hardly",
    ],
  },
  {
    question:
      "Your toddler spontaneously looks at you when faced with an unfamiliar situation",
    choices: [
      "Strongly agree",
      "Agree",
      "Slightly agree",
      "Slightly disagree.",
      "Strongly Disagree.",
    ],
  },
  {
    question:
      "You and immediate family members can easily understand what your toddler may be trying to say (even though s/he may not have fully developed speech skills yet)",
    choices: ["Always", "Usually.", "Sometimes.", "Rarely.", "Never."],
  },
  {
    question:
      "Your toddler is adept at using sign language to point out what s/he wants for example a toy, or a cookie jar that may be out of reach",
    choices: [
      "Several times a day",
      "Few times a day",
      "Several times a week",
      "Less than 4 - 5 times a week",
      "Hardly ever.",
    ],
  },
  {
    question:
      "The best way to describe YOUR emotion when you heard your toddler’s first few words would be? choose the emoticon that best resembled your emotion",
    choices: ["Excited", "Happy", "Neutral", "Confused.", "Non-Verbal"],
  },
  {
    question:
      "Does your toddler have a habit of repeating words exactly the way they are told? e.g. she/he repeats a question that she/he was asked, or lines from a movie or a song",
    choices: [
      "Several times a day.",
      "2 to 3 times a day",
      "Several times a week",
      "Less than 3 times a week",
      "Hardly ever",
    ],
  },
  {
    question:
      "Your toddler always likes to line up his/her toys, or arrange them in ‘a’ specific order, every time! your toddler’s mind works in a particular pattern, and that is usually consistent with a few things she/he does",
    choices: ["Always", "Usually.", "Sometimes.", "Rarely.", "Never."],
  },
  {
    question:
      "Your toddler is usually good at pretending while playing for example, with a toy phone or a doll",
    choices: [
      "Strongly agree",
      "Slightly agree.",
      "Neutral",
      "Slightly disagree.",
      "Strongly Disagree.",
    ],
  },
  {
    question:
      "Your toddler has a habit of licking unusual objects or sniffing at things for example, sniffing at food before eating or sniffing at her clothes before wearing",
    choices: [
      "Several times a day.",
      "2 - 3 times a day",
      "Several times a week",
      "2 - 3 times a week",
      "Rarely",
    ],
  },
  {
    question:
      "Your toddler is usually good at using his/her hands in the right way when he/she needs to do something for example, placing a hand on the door knob to open the door, or on the toy phone keypad as if pretending to call",
    choices: [
      "Several times a day",
      "3 to 5 times a day",
      "Several times a week",
      "Less than 5 to 7 a week",
      "Hardly ever",
    ],
  },
  {
    question:
      "Does your child do tiptoe and/or Flaps hand are regular frequencies?",
    choices: [
      "Neither",
      "Very occasionally",
      "Only Tiptoes",
      "Only hand flaps",
      "Tiptoes and hand flaps",
    ],
  },
  {
    question:
      "How does your child react when there is a sudden change in plan or some objects are out of their usual place?",
    choices: ["Excited.", "Happy.", "Neutral", "Sad", "Angry"],
  },
  {
    question:
      "Your toddler has an odd habit of doing the same thing over and over again for example, running and closing the tap, turning a switch on and off or opening and closing the door over and over again",
    choices: [
      "Strongly agree.",
      "Slightly agree",
      "Neutral",
      "Slightly disagree",
      "Strongly Disagree",
    ],
  },
  {
    question:
      "For how long is your toddler’s interest maintained in just one or two objects that he/she can’t seem to get his/her mind off?",
    choices: [
      "Several hours a day",
      "Approx 30 mins a day",
      "About 10 mins",
      "Normal",
      "Very short attention span",
    ],
  },
  {
    question:
      "Your toddler enjoys spending a lot of time twiddling objects repeatedly for example, a piece of string or a spinner",
    choices: [
      "Strongly agree.",
      "Slightly agree",
      "Neutral.",
      "Slightly disagree",
      "Strongly Disagree..",
    ],
  },
  {
    question:
      "Your toddler spends time staring at something (or nothing) for too long without any apparent reason for example, the wall, a picture canvas or a telephone tower",
    choices: [
      "Strongly agree.",
      "Slightly agree",
      "Neutral",
      "Slightly disagree",
      "Strongly Disagree",
    ],
  },
  {
    question:
      "Rate, in the order of preference, how your child wants to spend his/her free time. rank the priorities on 1 to 5, 5 being most preferred",
    choices: ["Outdoors", "Gadgets", "Coloring", "Music", "By Him/Herself"],
  },
  {
    question: "Is your child toilet trained yet?",
    choices: ["Yes", "No"],
  },
  {
    question:
      "In which social setting is your child most comfortable? select the one where your child is at his/her usual best",
    choices: ["With friends", "Alone", "Preschool/Daycare", "With family"],
  },
  {
    question:
      "Select all the numbers that your toddler can CORRECTLY recognize? select all the options that apply",
    choices: ["Seven", "Three", "Zero", "Nine", "None."],
  },
  {
    question:
      "Select all the Geometrical shapes that your toddler can CORRECTLY identify? select all the options that apply",
    choices: ["Circle", "Rectangle", "Triangle", "Cube", "None"],
  },
  {
    question:
      "When your child is in a terrible mood, what works best to comfort him/her? for example when your toddler is throwing a tantrum or is really upset",
    choices: ["Hug", "Gadgets", "Sugar", "Pets", "Play"],
  },
  {
    question: "Which of these emoticons best describe your child’s usual mood?",
    choices: [
      "Happy",
      "Mischievous",
      "Neutral",
      "Confused",
      "Grumpy",
      "Non Verbal",
    ],
  },
  {
    question: "thanks for your answers  ",
    choices: [],
  },
];
const sections = [
  {
    message:
      "This section tries to assess your child’s observation and cognitive skills. The questions here apply to all ages. All questions are mandatory for this section.",

  },
  {
    message:
      "This section evaluates the social skills that your child has developed so far. Scoring is weighed based on the age of your child.",

  },
  {
    message:
      "The aim of this section is to score your child’s communication skills. Some questions will automatically show/hide based on your child’s age. For example, certain questions may apply for 3 year old but not a 2 year old toddler.",

  },
  {
    message:
      "This area of evaluation targets the sensory functions, behavioral patterns and the motor skills that your child has. Scores are weighed based on the age of your toddler. Your toddler always likes to line up his/her toys, or arrange them in ‘a’ specific order, every time!",

  },
];

let currentQuestionIndex = -1; // Index of the current question being asked
let chatWaitingForResponse = false; // Flag indicating if the chat is waiting for a user response
let numPlus = 0;
let numMinus = 0;
let numques = 0;
// Function to present the question and choices to the user
function presentQuestion(question) {
  // Display the question
  const botChatContent = `<div class="msg_cotainer ask">${question.question}</div>`;
  chatHistory.innerHTML += botChatContent;

  // Display the choices
  question.choices.forEach((choice, index) => {
    const botChatContent = `
        <div class="msg_cotainer_send choice" onclick="handleAnswerClick(this, ${index})">${index + 1
      } => ${choice}</div>
      `;
    chatHistory.innerHTML += botChatContent;
  });

  // Set a flag indicating that the chat is waiting for a user response to the question
  chatWaitingForResponse = true;
}

// Function to handle user clicks on answer options
function handleAnswerClick(clickedElement, index) {
  if (!chatWaitingForResponse) return; // Ignore clicks if not waiting for a response

  // Toggle the 'selected-answer' class on the clicked element
  clickedElement.classList.toggle('selected-answer');

  const selectedAnswer = questions[currentQuestionIndex].choices[index];
  // Check if the user has selected an answer
  if (!selectedAnswer.trim()) {
    alert("Please select an answer before proceeding.");
    return; // Exit the function early if no answer is selected
  }
  let note;
  switch (selectedAnswer.trim()) {
    case "Always.":
    case "Several times a day":
    case "Several times a week":
    case "Approx 30 mins a day":
    case "2 - 3 times a week":
    case "About 10 mins":
    case "Only few times a day":
    case "Excited":
    case "Yes":
    case "Never":
    case "Rarely":
    case "Happy":
    case "Sometimes.":
    case "Usually.":
    case "Slightly agree.":
    case "Sad":
    case "Neither":
    case "Agree":
    case "Mischievous":
    case "Strongly agree":
    case "Slightly disagree":
    case "Strongly Disagree":
    case "Neutral.":
    case "Sugar":
    case "With friends":
    case "Play":
    case "Triangle":
    case "Circle":
    case "Three":
    case "Preschool/Daycare":
    case "Very occasionally":
    case "3 to 5 times a day":
    case "2 to 3 times a day":
    case "Approx 2 to 5 minutes":
    case "Approx 10 to 15 minutes":
      note = "-1";
      break;
    case "Always":
    case "Sometimes":
    case "Usually":
    case "Mostly":
    case "Happy.":
    case "Sometimes":
    case "Natural":
    case "None":
    case "Several times a week.":
    case "Sometimes":
    case "Hardly ever.":
    case "Less than 5 times a week.":
    case "Excited.":
    case "Confused.":
    case "Strongly Disagree..":
    case "Neutral":
    case "Normal":
    case "Pets":
    case "Hug":
    case "Seven":
    case "Cube":
    case "Triangle":
    case "Gadgets":
    case "Zero":
    case "No":
    case "Nine":
    case "With family":
    case "Less than 5 to 7 a week":
    case "Very short attention span":
    case "Tiptoes and hand flaps":
    case "2 - 3 times a week":
    case "Less than 3 times a week":
      note = "0";
      break;
    case "Several times a day.":
    case "Rarely.":
    case "None.":
    case "Less than 5 times a week":
    case "Several hours a day":
    case "Hardly":
    case "Rarely.":
    case "Never.":
    case "Hardly ever":
    case "Grumpy":
    case "Sad.":
    case "Non Verbal":
    case "Confused":
    case "Strongly Disagree.":
    case "Strongly agree.":
    case "Slightly agree":
    case "Slightly disagree.":
    case "Alone":
    case "Only hand flaps":
    case "Only Tiptoes ":
    case "Very Frequently ":
    case "Many times during the day":
    case "More than 30 mins a day":
      note = "1";
      break;
    default:
      note = "";
      break;
  }
  numques++;
  if (note !== "") {
    console.log("Selected answer:", selectedAnswer, "Note:", note);

  } else {
    console.log("Selected answer:", selectedAnswer);

  }

  if (note === "1") {
    numPlus++;
  } else if (note === "-1") {
    numMinus++;
  }

  console.log('num of questions :' + numques);
  console.log('num of Plus :' + numPlus);
  console.log('num of Minus :' + numMinus);
  if (numques === 34) {
    calculateAutismStatus();
    console.log("Autism Status:", autismStatus);
  }
  // Call the server endpoint to insert the metric
  fetch('/insertmetric', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ metric_name: selectedAnswer, metric_value: note })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to insert metric.');
      }
      return response.json();
    })
    .then(data => {
      console.log(data.message); // Log the success message from the server
    })
    .catch(error => {
      console.error('Error inserting metric:', error.message);
    });
  // Continue the conversation or ask the next question after 10 seconds
  setTimeout(askNextQuestion, 1000);



  // Set the flag to indicate that the chat is no longer waiting for a response
  chatWaitingForResponse = false;
}

let currentSectionIndex = 0;
let acsses = false;
// Function to present the next question
function askNextQuestion(index) {
  const sectionIndices = [2, 8, 12, 16];
  if (index === 1) {
    currentQuestionIndex = 0; // Reset question index when index is 1
  } else {
    currentQuestionIndex++; // Increment question index for other cases
  }

  if (currentQuestionIndex < questions.length) {
    if (sectionIndices.includes(currentQuestionIndex)) {
      const section = sections[currentSectionIndex];
      const botChatContent = `<div class="msg_cotainer section">${section.message}</div>`;
      chatHistory.innerHTML += botChatContent;
      currentSectionIndex++;
    }
    const currentQuestion = questions[currentQuestionIndex];
    presentQuestion(currentQuestion);
  } else {
    console.log("End of questions.");
    calculateAutismStatus(); // Call the function to calculate autism status
  }
}


// Function to calculate the autism status after all questions have been answered
function calculateAutismStatus() {
  console.log('numPlus: ' + numPlus);
  console.log('numMinus: ' + numMinus);
  // Determine if the child might have autism or not
  let autismStatus;
  if (numPlus > numMinus) {
    autismStatus = `We recommend a comprehensive assessment by a specialist in the field of autism spectrum disorder to confirm the diagnosis or rule out any other possibilities. The assessment will typically include behavioral observations, evaluative tests, and interviews with you.

    Tips for supporting <b style="text-transform: uppercase;">${chidname1}</b>:
    
    Communicate clearly: Use simple and direct language when communicating with <b style="text-transform: uppercase;">${chidname1}</b>. Make sure to maintain eye contact and keep positive body language.
    
    Create a calm environment: Minimize noise and clutter as much as possible, as these factors can overstimulate <b style="text-transform: uppercase;">${chidname1}</b>.
    
    Provide a regular routine: Help <b style="text-transform: uppercase;">${chidname1}</b> feel safe and secure by following a regular routine for daily activities.
    
    Encourage social interactions: Engage <b style="text-transform: uppercase;">${chidname1}</b> in age-appropriate social activities, such as playing with other children or participating in sports or art groups.
    
    Be patient and understanding: Remember that <b style="text-transform: uppercase;">${chidname1}</b> is learning and growing at their own pace. Be patient and supportive, and celebrate their achievements no matter how small.`;
  } else if (numMinus > numPlus) {
    autismStatus = `We would like to inform you of the results of the behavioral assessment of your child, <b style="text-transform: uppercase;">${chidname1}</b>, conducted during the past period. We are pleased to inform you that the assessment did not reveal any indicators that suggest the possibility that <b style="text-transform: uppercase;">${chidname1}</b> has Autism Spectrum Disorder (ASD).
    
    Tips for supporting <b style="text-transform: uppercase;">${chidname1}</b>'s development:
    
    Communicate clearly: Continue to communicate with <b style="text-transform: uppercase;">${chidname1}</b> clearly and patiently, using simple and direct language that is appropriate for their age.
    
    Provide a stimulating environment: Ensure that you provide a stimulating environment that encourages <b style="text-transform: uppercase;">${chidname1}</b> to learn and explore. Offer them a variety of toys and activities that are appropriate for their age and interests.
    
    Encourage social interactions: Encourage <b style="text-transform: uppercase;">${chidname1}</b> to interact with other children and participate in age-appropriate social activities.
    
    Be patient and understanding: Remember that every child learns and develops at their own pace. Be patient and supportive, and celebrate <b style="text-transform: uppercase;">${chidname1}</b>'s achievements no matter how small.`;
  } else {
    autismStatus = "Child maybe has autism, maybe not";
  }

  // Output the autism status in the chat
  const botChatContent = `<div class="msg_cotainer ask">${autismStatus}</div>`;
  chatHistory.innerHTML += botChatContent;


}

// Call askNextQuestion to start the conversation with the first question


async function sendMessage() {
  try {
    const userMessage = userInput.value.trim();
    if (!userMessage) {
      return;
    }
    userInput.value = "";

    const userChatContent = `
              <div class="msg_cotainer" style="color: #4A4A4A; border: 1px solid #ccc; background: #8CB9F5; padding: 10px; margin-bottom: 30px; border-radius: 25px;">
                  ${userMessage}
              </div>
              <div class="msg_cotainer_send" id="loading-spinner" style="margin-bottom: 30px;">
                  <div class="spinner-border text-primary rounded-circle" role="status" style="width: 40px; height: 40px; animation: spin 2s linear infinite;">
                      <span aria-hidden="true">
                          <img src="images/react.png" class="rounded-circle user_img" style="width: 80%; height: 80%;" alt="Loading Icon">
                      </span>
                  </div>
              </div>
          `;

    chatHistory.innerHTML += userChatContent;


    // Determine the endpoint based on the existence of currentConversationId1
    let endpoint;
    if (currentConversationId1 !== null) {
      endpoint = "/chatchild";
    } else if (currentConversationId) {
      endpoint = "/chat2";
    } else {
      endpoint = "/chat";
    }

    // Send message to the appropriate endpoint based on the conversation ID
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userInput: userMessage,
        conversation_id: currentConversationId,
      }), // Pass conversationId if available
    });
    if (!response.ok) {
      throw new Error("Failed to send message");
    }
    const data = await response.json();
    console.log("Data:", data);

    if (data && data.response) {
      // Extract code content from within triple backticks
      const codeMatch = data.response.match(/^```([\s\S]*?)```$/);
      if (codeMatch) {
        const code = codeMatch[1]; // Extract content between triple backticks
        const codeCard = `
                        <div class="code-card" style="position: relative; color: #4A4A4A; display: flex; justify-content: flex-start; border-radius: 10px; padding: 10px; background-color: rgba(0, 0, 0, 0.075); margin-bottom: 10px;">
                            <span class="" data-state="closed" style="position: absolute; top: -30px; right: 10px;">
                                <button onclick="copyCodeToClipboard(this)" class="flex gap-1 items-center" style="border-radius: 5px; color: white; background-color: rgba(0, 0, 0, 0.3); padding: 5px;">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-sm">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C10.8954 3.5 10 4.39543 10 5.5H14C14 4.39543 13.1046 3.5 12 3.5ZM8.53513 3.5C9.22675 2.3044 10.5194 1.5 12 1.5C13.4806 1.5 14.7733 2.3044 15.4649 3.5H17.25C18.9069 3.5 20.25 4.84315 20.25 6.5V18.5C20.25 20.1569 19.1569 21.5 17.25 21.5H6.75C5.09315 21.5 3.75 20.1569 3.75 18.5V6.5C3.75 4.84315 5.09315 3.5 6.75 3.5H8.53513ZM8 5.5H6.75C6.19772 5.5 5.75 5.94772 5.75 6.5V18.5C5.75 19.0523 6.19772 19.5 6.75 19.5H17.25C18.0523 19.5 18.25 19.0523 18.25 18.5V6.5C18.25 5.94772 17.8023 5.5 17.25 5.5H16C16 6.60457 15.1046 7.5 14 7.5H10C8.89543 7.5 8 6.60457 8 5.5Z" fill="currentColor"></path>
                                    </svg>Copy code
                                </button>
                            </span>
                            <pre style="margin: 0 10px 0 10px; overflow-x: auto; color: #4A4A4A;"><code class="language-python">${code}</code></pre>
                        </div>
                    `;

        chatHistory.innerHTML += codeCard;

      } else {
        const botMessage = data.response;
        // Remove loading spinner from bot's response
        const botChatContent = `
                <div class="msg_cotainer_send">${botMessage}</div>
            `;
        chatHistory.innerHTML += botChatContent;
      }
    }
    // Scroll to the bottom of the chat history
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Insert conversation into database
    const endTime = new Date().toISOString();
    const insertResponse = await fetch("/insertConversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        startTime: startTime.toISOString(),
        endTime: endTime,
        userInput: userMessage,
        botResponse: data.response || data.code, // Response could be either message or code
      }),
    });
    if (!insertResponse.ok) {
      throw new Error("Failed to insert conversation into database");
    }
    const insertData = await insertResponse.json();
    console.log(insertData);
  } catch (error) {
    console.error("Error:", error);
    // Handle errors gracefully
    // For example, display an error message to the user
  } finally {
    // Hide loader after receiving response
    const loadingSpinner = document.getElementById("loading-spinner");
    if (loadingSpinner) {
      loadingSpinner.remove();
    }
  }
}
// Call fetchChildNames when the page loads
window.addEventListener("load", () => {
  fetchChildNames()
    .then((childNames) => {
      // Additional logic after fetching child names, if needed
    })
    .catch((error) => {
      console.error("Error fetching child names:", error);
      // Handle error if needed
    });
});
