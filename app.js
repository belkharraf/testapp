const API_CONFIG = {
    OPENAI_API_URL: 'https://api.openai.com/v1',
    IMAGE_SIZE: "1024x1024",
    MODEL: "gpt-3.5-turbo"
};

document.getElementById('articleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        apiKey: document.getElementById('apiKey').value,
        title: document.getElementById('title').value,
        language: document.getElementById('language').value,
        voice: document.getElementById('voice').value,
        wordCount: document.getElementById('wordCount').value
    };

    try {
        showLoading();
        
        const [article, imageUrl] = await Promise.all([
            generateArticle(formData),
            generateImage(formData.apiKey, formData.title)
        ]);

        const seoAnalysis = analyzeSEO(article);
        updateResults(imageUrl, article, seoAnalysis);
        hideLoading();
    } catch (error) {
        alert('Error: ' + error.message);
        hideLoading();
    }
});

async function generateArticle(formData) {
    const response = await fetch(`${API_CONFIG.OPENAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${formData.apiKey}`
        },
        body: JSON.stringify({
            model: API_CONFIG.MODEL,
            messages: [{
                role: "user",
                content: generatePrompt(formData)
            }],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate article');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function generateImage(apiKey, title) {
    const response = await fetch(`${API_CONFIG.OPENAI_API_URL}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            prompt: `Create a professional and relevant image for an article about: ${title}`,
            n: 1,
            size: API_CONFIG.IMAGE_SIZE
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    return data.data[0].url;
}

function generatePrompt(formData) {
    return `Write a ${formData.voice.toLowerCase()} article about "${formData.title}" in ${formData.language} with approximately ${formData.wordCount} words.

    SEO Requirements:
    - Use proper heading hierarchy (H1, H2, H3)
    - Include relevant keywords naturally
    - Optimize for readability and search engines
    - Include a table of contents
    - Add alt text suggestions for images
    - Optimize paragraph length for readability
    `;
}

function analyzeSEO(article) {
    const analysis = {
        score: 0,
        recommendations: []
    };

    // Content Length Analysis
    const wordCount = article.split(/\s+/).length;
    if (wordCount < 300) {
        analysis.recommendations.push({
            type: 'warning',
            message: 'Article length is too short for optimal SEO (recommended: >300 words)'
        });
    } else {
        analysis.recommendations.push({
            type: 'success',
            message: 'Article length is good for SEO'
        });
    }

    // Heading Analysis
    const hasHeadings = /#{1,6}\s/.test(article);
    if (hasHeadings) {
        analysis.recommendations.push({
            type: 'success',
            message: 'Article contains proper heading structure'
        });
    } else {
        analysis.recommendations.push({
            type: 'error',
            message: 'No headings found in the article'
        });
    }

    // Paragraph Length Analysis
    const paragraphs = article.split(/\n\n+/);
    const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150).length;
    if (longParagraphs > 0) {
        analysis.recommendations.push({
            type: 'warning',
            message: 'Some paragraphs are too long (recommended: <150 words)'
        });
    } else {
        analysis.recommendations.push({
            type: 'success',
            message: 'Paragraph lengths are optimal for readability'
        });
    }

    // Calculate overall score
    const total = analysis.recommendations.length;
    const successes = analysis.recommendations.filter(r => r.type === 'success').length;
    analysis.score = Math.round((successes / total) * 100);

    return analysis;
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('resultContainer').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('resultContainer').style.display = 'block';
}

function updateResults(imageUrl, article, seoAnalysis) {
    document.getElementById('imageContainer').innerHTML = 
        `<img src="${imageUrl}" alt="Generated image for article">`;
    document.getElementById('articleContainer').innerHTML = article;
    updateSEOAnalysis(seoAnalysis);
}

function updateSEOAnalysis(analysis) {
    const seoScoreContainer = document.getElementById('seoScoreContainer');
    const seoAnalysisContainer = document.getElementById('seoAnalysis');

    seoScoreContainer.innerHTML = `
        <h3>SEO Score: ${analysis.score}%</h3>
        <div class="progress-bar">
            <div class="progress" style="width: ${analysis.score}%"></div>
        </div>
    `;

    seoAnalysisContainer.innerHTML = `
        <h3>SEO Analysis</h3>
        <ul>
            ${analysis.recommendations.map(rec => `
                <li class="${rec.type}">
                    <span class="icon">${rec.type === 'success' ? '✓' : rec.type === 'warning' ? '⚠' : '✗'}</span>
                    ${rec.message}
                </li>
            `).join('')}
        </ul>
    `;
}