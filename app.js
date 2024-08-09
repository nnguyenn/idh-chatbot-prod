var linkElement = document.createElement("link");

linkElement.rel = "stylesheet";
linkElement.href = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";

document.head.appendChild(linkElement);

const chatLogoSVG = `
    <svg width="100" height="87" viewBox="0 0 100 87" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M87.5 53.9474C87.5 55.8551 86.622 57.6846 85.0592 59.0336C83.4964 60.3825 81.3768 61.1403 79.1667 61.1403H29.1667L12.5 75.5263V17.9825C12.5 16.0748 13.378 14.2452 14.9408 12.8962C16.5036 11.5473 18.6232 10.7895 20.8333 10.7895H79.1667C81.3768 10.7895 83.4964 11.5473 85.0592 12.8962C86.622 14.2452 87.5 16.0748 87.5 17.9825V53.9474Z" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M33.3333 35.965H33.3745" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M50 35.965H50.0412" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M66.6666 35.965H66.7078" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`

const exitLogoSVG = `
    <svg width="40" height="40" viewBox="0 0 59 57" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 4.5L54 52" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M54 5L5 52" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`

const chatSendSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" data-id="18">
        <path d="m5 12 7-7 7 7"></path>
        <path d="M12 19V5"></path>
    </svg>`

const chatEndpointURL = 'https://us-central1-idh-chatbot-prod.cloudfunctions.net/idh-chat'

// track conversation with array
const chatList = [{
    role: "bot",
    text: "Aloha! How can I help you today? 🤙"
}]

function scrollToBottom(containerId) {
    var container = document.getElementById(containerId);
    container.scrollTop = container.scrollHeight;
    console.log('scrolling down', container.scrollHeight);
}


function pushNewUserChat(chatText) {
    chatList.push({
        role: "user",
        text: chatText
    });

    renderChats();
    scrollToBottom('conversation-scroll-container');

    submitChat(chatText);
}

function createNewResponse(extraClass = '') {
    var convoContainer = document.getElementById("conversation-container");

    var botResponse = document.createElement("div");
    botResponse.className = `rounded-tl-lg rounded-tr-lg rounded-br-lg p-2 bg-gray-800 text-white dark:bg-gray-800 ${extraClass}`;
    botResponse.innerHTML = '';

    convoContainer.appendChild(botResponse);

    return botResponse;
}

function showLoadingDots() {
    var loadingDots = document.getElementById("loading-dots");
    loadingDots.style.display = "block";
}

function hideLoadingDots() {
    var loadingDots = document.getElementById("loading-dots");
    loadingDots.style.display = "none";
}

// Function to handle receiving text stream data
async function handleStreamResponse(response) {
    showLoadingDots();
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let responseText = '';
    let accumulatedResponse = '';

    const responseElement = createNewResponse('partial-response');

    while (true) {
        try {
            const { done, value } = await reader.read();
            if (done) {
                hideLoadingDots();
                console.log("Stream done, accumulated response text:", accumulatedResponse);

                // Check if the response contains the booking link
                if (accumulatedResponse.includes('https://book.islanddetailhawaii.com')) {
                    const formattedText = formatTextWithLinks(accumulatedResponse.replace(/\n/g, '<br>'));
                    responseElement.innerHTML = formattedText;
                    console.log("EXECUETSFASDKFSDFAS");
                } else {
                    const formattedText = formatTextWithLinks(accumulatedResponse.replace(/\n/g, '<br>'));
                    responseElement.innerHTML = formattedText;
                }

                chatList.push({
                    role: "bot",
                    text: accumulatedResponse // Store the plain text response
                });
                renderChats();
                break;
            }
            responseText += decoder.decode(value, { stream: true });
            accumulatedResponse += responseText;

            responseElement.innerHTML += formatTextWithLinks(responseText.replace(/\n/g, '<br>'));
            responseText = '';
            scrollToBottom('conversation-scroll-container');
        } catch (error) {
            console.error('Error reading stream:', error);
            hideLoadingDots();
        }
    }
}





function handlePlainTextResponse(text, isFinal) {
    if (isFinal) {
        const convoContainer = document.getElementById("conversation-container");
        while (convoContainer.lastChild && convoContainer.lastChild.className.includes('partial-response')) {
            convoContainer.removeChild(convoContainer.lastChild);
        }
    }

    const responseElement = createNewResponse(isFinal ? '' : 'partial-response');
    console.log("Final formatted response:", formatTextWithLinks(accumulatedResponse));

    responseElement.innerHTML = formatTextWithLinks(text);

    chatList.push({
        role: "bot",
        text: text
    });

    scrollToBottom('conversation-scroll-container');
}

function formatTextWithLinks(text) {
    // Create regex patterns for matching phone numbers, addresses, and book now links
    const phonePattern = /808-460-6985/g;  // Island Detail Hawaii phone number
    const bookNowPattern = /(https:\/\/book\.islanddetailhawaii\.com)/gi;

    // Replace matched patterns with corresponding HTML links
    const formattedText = text
        .replace(phonePattern, '<a href="tel:808-460-6985" class="underline">$&</a>')
        .replace(bookNowPattern, '<a href="$1" target="_blank" class="underline">$1</a>');

    return formattedText;
}

// Function to initiate connection and handle stream
async function initiateStreamConnection(url, data) {
    try {
        showLoadingDots();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        await handleStreamResponse(response);
    } catch (error) {
        console.error('Error initiating stream:', error);
        hideLoadingDots();
    }
}

// Function to submit a chat message and initiate stream connection
function submitChat(text) {
    initiateStreamConnection(chatEndpointURL, { query: text });
    scrollToBottom('conversation-scroll-container');
}

// Function to create and append the chat widget
function createChatWidget() {
    // Create chat widget element
    var chatWidget = document.createElement("div");
    chatWidget.setAttribute("id", "chat-widget");

    // Add styling classes for responsiveness 
    chatWidget.className = "rounded-lg border bg-card text-card-foreground shadow-sm justify-between flex-col bg-white ml-4 md:ml-0 h-3/4 md:h-[550px] lg:h-[764px]";

    // Style chat widget
    chatWidget.style.position = "fixed";
    chatWidget.style.bottom = "84px";
    chatWidget.style.right = "20px";
    chatWidget.style.width = "400px";
    chatWidget.style.maxHeight = "764px";
    chatWidget.style.zIndex = "1000";
    chatWidget.style.display = "none"; // Hide initially

    // Append chat widget to the body
    document.body.appendChild(chatWidget);

    chatWidget.innerHTML = `
        <div class="flex flex-col space-y-1.5 p-6 border-b" data-id="8">
            <div class="flex-1" data-id="9">
                <h2 class="text-lg font-bold leading-none mb-2" data-id="10">Welcome to Island Detail Hawaii!</h2>
                <p class="text-sm leading-none text-gray-500 dark:text-gray-400" data-id="11">
                    Ask me anything about Island Detail!
                </p>
            </div>
        </div>
        <div id="conversation-scroll-container" class="flex-grow p-4 grid gap-4 justify-self-end overflow-y-scroll" data-id="10">
            <div id="conversation-container" class="space-y-2" data-id="11">
                <div class="rounded-tl-lg rounded-tr-lg rounded-br-lg p-2 bg-gray-800 text-white dark:bg-gray-800" data-id="12">
                    Aloha! How can I help you today?
                </div>
            </div>
        </div>`;

    // Add CSS styles for links
    var styleElement = document.createElement("style");
    styleElement.innerHTML = `
        .underline {
            text-decoration: underline;
            color: white;
        }
        .underline:hover {
            color: #476DC2;
        }
        
        #notification-circle {
            position: fixed;
            bottom: 55px; 
            right: 17px; 
            width: 24px;
            height: 24px;
            background-color: red;
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
            font-size: 14px;
            font-weight: bold;
        }
        #welcome-text {
            position: fixed;
            bottom: 85px;
            right: 45px;
            background-color: #1b2d3e;
            color: #fff;
            padding: 10px;
            border-radius: 8px;
            z-index: 1001;
            opacity: 1;
            transition: opacity 1s ease-in-out;
        }
        #welcome-text::after {
            content: "";
            position: absolute;
            bottom: -10px; /* Adjust this to position the tip */
            right: 20px; /* Adjust this to align with the text */
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-top: 10px solid #1b2d3e;

        }
        #loading-dots {
            display: none;
            text-align: center;
            margin-top: 10px;
        }
        
        #loading-dots div {
            width: 10px;
            height: 10px;
            margin: 3px;
            background-color: #1b2d3e;
            border-radius: 50%;
            display: inline-block;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        
        #loading-dots div:nth-child(1) {
            animation-delay: -0.32s;
        }
        
        #loading-dots div:nth-child(2) {
            animation-delay: -0.16s;
        }
        
        @keyframes bounce {
            0%, 80%, 100% {
                transform: scale(0);
            }
            40% {
                transform: scale(1);
            }
        }
        
        #chat-widget {
            transform: scale(0);
            opacity: 0;
            display: none;
            transform-origin: bottom right;
            transition: transform 0.5s ease, opacity 0.5s ease;
        }
    `;
    document.head.appendChild(styleElement);

    // Notification circle
    var notificationCircle = document.createElement("div");
    notificationCircle.setAttribute("id", "notification-circle");
    notificationCircle.innerText = "1";
    document.body.appendChild(notificationCircle);

    // Welcome text
    var welcomeText = document.createElement("div");
    welcomeText.setAttribute("id", "welcome-text");
    welcomeText.innerText = "Aloha! This is your personal Island Detail Assistant";
    document.body.appendChild(welcomeText);
    
    // Function to check if the current page is the homepage
    function isHomepage() {
        return window.location.pathname === "/";
    }

    // Show or hide notification circle and welcome text based on the current page
    function checkHomepage() {
        if (isHomepage()) {
            notificationCircle.style.display = "flex";
            welcomeText.style.display = "block";
        } else {
            notificationCircle.style.display = "none";
            welcomeText.style.display = "none";
        }
    }

    checkHomepage();

    var loadingDots = document.createElement("div");
    loadingDots.setAttribute("id", "loading-dots");
    loadingDots.innerHTML = '<div></div><div></div><div></div>';
    chatWidget.appendChild(loadingDots);

    // Fade out welcome text after 5 seconds
    setTimeout(() => {
        welcomeText.style.opacity = "0";
        setTimeout(() => {
            welcomeText.remove();
        }, 1000); // Remove the element after fade out
    }, 5000);

    // chat chips
    var chatChipsContainer = document.createElement("div");
    chatChipsContainer.setAttribute("id", "chips-container");
    chatChipsContainer.className = "flex flex-row space-x-0.5 sm:space-x-1 md:space-x-2 px-0.5 sm:px-1 md:px-2 pt-2";

    const chipsText = ["Services", "Fleet Cleaning", "Book Now"]
    chipsText.forEach((text) => {
        var chatChip = document.createElement("div");
        chatChip.className = "text-gray-800 px-3 py-1 rounded-full flex-grow text-xs text-center border-4 border-gray-600 hover:bg-gray-600 hover:text-white cursor-pointer";
        chatChip.innerText = text;
        chatChipsContainer.appendChild(chatChip);

        chatChip.addEventListener("click", () => {
            pushNewUserChat(text);
        });
    })

    chatWidget.appendChild(chatChipsContainer);


    // chat input
    var chatInputContainer = document.createElement("div");
    chatInputContainer.setAttribute("id", "chat-container");
    chatInputContainer.className = "mt-auto p-4";

    var chatInputBar = document.createElement("div");
    chatInputBar.setAttribute("id", "chat-bar");
    chatInputBar.className = "flex space-x-2";

    var chatInputEl = document.createElement("input");
    chatInputEl.className = "flex h-10 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1 min-w-0 rounded-full"
    chatInputEl.placeholder = "Type a message..."

    var chatSendBtn = document.createElement("button");
    chatSendBtn.className = "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-full h-10";
    chatSendBtn.innerHTML = chatSendSVG;


    function processChat() {
        const chatText = chatInputEl.value;
        pushNewUserChat(chatText);
        chatInputEl.value = "";
        scrollToBottom('conversation-scroll-container');
    }

    chatSendBtn.addEventListener("click", processChat);
    chatInputEl.addEventListener("keydown", (event) => {
        if (event.key === 'Enter') {
            processChat();
        }
    })

    chatInputBar.appendChild(chatInputEl);
    chatInputBar.appendChild(chatSendBtn);
    chatInputContainer.appendChild(chatInputBar);
    chatWidget.appendChild(chatInputContainer);
}

// Function to toggle the chat widget visibility
function toggleChatWidget() {
    var chatWidget = document.getElementById("chat-widget");
    var circleIcon = document.getElementById("circle-icon");
    var notificationCircle = document.getElementById("notification-circle");
    var welcomeText = document.getElementById("welcome-text");

    if (chatWidget.style.display === "none" || chatWidget.style.display === "") {
        // Maximize the chat widget from bottom right
        chatWidget.style.display = "flex";
        requestAnimationFrame(() => {
            chatWidget.style.transformOrigin = "bottom right";
            chatWidget.style.transform = "scale(1)";
            chatWidget.style.opacity = "1";
        });
        // Change the icon to exit
        circleIcon.innerHTML = exitLogoSVG;

        // Hide the notification and welcome text
        if (notificationCircle) notificationCircle.style.display = "none";
        if (welcomeText) welcomeText.style.display = "none";

    } else {
        // Minimize the chat widget to bottom right
        chatWidget.style.transformOrigin = "bottom right";
        chatWidget.style.transform = "scale(0)";
        chatWidget.style.opacity = "0";
        chatWidget.style.transition = "transform 0.5s ease, opacity 0.5s ease";

        setTimeout(() => {
            chatWidget.style.display = "none";
            // Change the icon back to chat
            circleIcon.innerHTML = chatLogoSVG;
        }, 500); // Match the duration of the transition
    }
}



// Function to create and append the circle icon button
function createCircleIcon() {
    // Create circle icon element
    var circleIcon = document.createElement("div");
    circleIcon.setAttribute("id", "circle-icon");

    circleIcon.className = "bg-gray-800 p-3"
    
    // Style circle icon
    circleIcon.style.position = "fixed";
    circleIcon.style.bottom = "20px";
    circleIcon.style.right = "20px";
    circleIcon.style.width = "50px";
    circleIcon.style.height = "50px";
    circleIcon.style.borderRadius = "50%";
    circleIcon.style.cursor = "pointer";
    circleIcon.style.display = "flex";
    circleIcon.style.justifyContent = "center";
    circleIcon.style.alignItems = "center";
    circleIcon.style.color = "#fff";
    circleIcon.style.fontSize = "24px";
    circleIcon.style.zIndex = "1000";
    circleIcon.style.transition = "transform 0.2s ease";

    circleIcon.innerHTML = chatLogoSVG;

    // Shrink the icon when clicked and stay small when held
    circleIcon.addEventListener("mousedown", () => {
        circleIcon.style.transform = "scale(0.8)";
    });
    circleIcon.addEventListener("mouseup", () => {
        circleIcon.style.transform = "scale(1)";
        toggleChatWidget();
    });

    document.body.appendChild(circleIcon);
}

function renderChats() {
    var convoContainer = document.getElementById("conversation-container");
    convoContainer.innerHTML = "";
    
    chatList.forEach((chat) => {
        var newChat = document.createElement("div");
        newChat.innerHTML = formatTextWithLinks(chat.text.replace(/\n/g, '<br>')); // Replace newlines with <br> and format links

        if (chat.role === "bot") {
            newChat.className = "rounded-tl-lg rounded-tr-lg rounded-br-lg p-2 bg-gray-800 text-white dark:bg-gray-800";
        } else {
            newChat.className = "rounded-tl-lg rounded-tr-lg rounded-bl-lg p-2 bg-gray-100 dark:bg-gray-800";
        }
        convoContainer.appendChild(newChat);
    });
}



// Call functions to create and append elements
createChatWidget();
createCircleIcon();
renderChats();