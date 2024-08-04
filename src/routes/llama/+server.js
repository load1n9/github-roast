// import { GROQ_API_KEY } from "$env/static/private";
import { createOpenAI as createGroq } from "@ai-sdk/openai";
import { generateText } from "ai";
import { json } from "@sveltejs/kit";

const groq = createGroq({
	baseURL: "https://api.groq.com/openai/v1",
	apiKey: process.env.GROQ_API_KEY,
});

const headers = {
	Accept: "application/json",
	"Content-Type": "application/json",
	"User-Agent": "github-roast.pages.dev",
};

export async function POST({ request }) {
	const { username, language } = await request.json();

	let profileResponse = { status: 403 };
	let useToken = false;

	// Check if the token is not rate-limited
	try {
		const response = await fetch(
			`https://api.github.com/users/${username}`,
			{
				headers: headers,
			},
		);
		profileResponse = await response.json();
		if (response.ok) {
			useToken = true;
		} else {
			return json({ error: "Our roast machine is in trouble" }, {
				status: 500,
			});
		}
	} catch (err) {
		console.log(err);
		const response = await fetch(
			`https://api.github.com/users/${username}`,
			{
				headers,
			},
		);
		profileResponse = await response.json();
	}

	// If token is rate-limited, fall back to no token
	if (!useToken) {
		delete headers["Authorization"];
	}

	let response = await fetch(
		`https://api.github.com/users/${username}/repos?sort=updated`,
		{
			headers: headers,
		},
	);
	const repoResponse = await response.json();

	let readmeResponse;
	try {
		response = await fetch(
			`https://raw.githubusercontent.com/${username}/${username}/main/README.md`,
			{ headers: headers },
		);
		if (response.ok) {
			readmeResponse = await response.text();
		}
	} catch (error) {
		console.log(error);
		try {
			response = await fetch(
				`https://raw.githubusercontent.com/${username}/${username}/master/README.md`,
				{ headers: headers },
			);
			// answerdebug += (await response.text()) + ' 4\n';
			if (response.ok) {
				readmeResponse = await response.text();
			}
		} catch (error) {
			console.log(error);
			console.log("failed to get readme");
			readmeResponse = "";
		}
	}

	// https://github.com/bagusindrayana/roastgithub-api/blob/master/index.js
	const datas = {
		name: profileResponse.name,
		bio: profileResponse.bio,
		company: profileResponse.company,
		location: profileResponse.location,
		followers: profileResponse.followers,
		following: profileResponse.following,
		public_repos: profileResponse.public_repos,
		profile_readme: readmeResponse,
		last_15_repositories: repoResponse
			.map((repo) => ({
				name: repo.name,
				description: repo.description,
				language: repo.language,
				stargazers_count: repo.stargazers_count,
				open_issues_count: repo.open_issues_count,
				license: repo.license,
				fork: repo.fork,
			}))
			.slice(0, 15),
	};

	let prompt =
		`give a short and harsh roasting for the following github profile: ${username}. Here are the details: "${
			JSON.stringify(datas)
		}"`;
	switch (language) {
		case "indonesian":
			prompt =
				`gunakan bahasa indonesia yang normal seperti manusia gaul, berikan roasting singkat dengan kejam dan menyindir dalam bahasa gaul untuk profile github berikut : ${username}. Berikut detailnya: "${
					JSON.stringify(datas)
				}"`;
			break;
		case "indian":
			prompt =
				`इस गिटहब प्रोफाइल के लिए एक क्रूर और व्यंग्यात्मक रोस्टिंग गली भाषा में दें: ${username}। विवरण इस प्रकार है: "${
					JSON.stringify(datas)
				}"`;
			break;
		case "chinese":
			prompt =
				`用俚语对以下GitHub个人资料进行短暂而残酷的讽刺：${username}。以下是详细信息: "${
					JSON.stringify(datas)
				}"`;
			break;
		case "japanese":
			prompt =
				`以下のGitHubプロフィールに対して残酷で皮肉な短いローストをギャル語でしてください: ${username}。詳細は次の通りです: "${
					JSON.stringify(datas)
				}"`;
			break;
		case "korean":
			prompt =
				`다음 GitHub 프로필에 대해 잔인하고 비꼬는 짧은 로스팅을 속어로 해주세요: ${username}. 자세한 내용은 다음과 같습니다: "${
					JSON.stringify(datas)
				}"`;
			break;
		case "france":
			prompt =
				`fais une courte et cruelle critique sarcastique en argot pour le profil GitHub suivant : ${username}. Voici les détails : "${
					JSON.stringify(datas)
				}"`;
			break;
	}

	// answerdebug += prompt + '\n';
	try {
		const completion = await generateText({
			model: groq("llama-3.1-70b-versatile"),
			system:
				"You roast people github account based on their bio, name, organizations, readme, and repos as harsh and spicy as possible, but still in a fun way.",
			prompt,
			maxTokens: 1024,
			temperature: 0.7,
			topP: 1,
			frequencyPenalty: 0,
			presencePenalty: 0,
		});

		const roast = completion.text;
		return json({ roast });
	} catch (error) {
		console.error("Error:", error);
		return json({ error: "Failed to generate roast" }, { status: 500 });
	}
}
