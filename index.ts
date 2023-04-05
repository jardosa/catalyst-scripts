import nace from './files/nace.json'
import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'


type SurveyQuestion = {
  type: string,
  name: string,
  title: string,
  description: string,
  isRequired: boolean,
  choices: string[],
  visibleIf?: string,
}

function upperAndSnakeCase(string) {
  return _.upperCase(string).replaceAll(' ', '_')
}

function createName(code: string, name: string) {
  return `${code}_${upperAndSnakeCase(name)}`
}

function parseNace(naceDoc: typeof nace): SurveyQuestion[] {
  const firstLevelQuestion: SurveyQuestion[] = [
    {
      name: 'PRIMARY_NACE_CODE',
      title: 'What was your organization’s primary Nomenclature of Economic Activities (NACE) category as of the end of the current reporting period?',
      description: "Organizations should select their primary NACE category based on the total revenue earned from the economic activity.",
      isRequired: true,
      type: 'checkbox',
      choices: naceDoc.filter(({ level }) => level === 1).map(({ name, section }) => `${section} - ${name}`)
    }
  ]

  const secondLevelQuestions = naceDoc
    .filter(({ level }) => level === 1)
    .map<SurveyQuestion>((doc) => {

      const parent = naceDoc.find(({ level, section }) => level === 1 && section === doc.section)

      const secondLevelChoices = naceDoc
        .filter(({ code, section }) => code.length === 2 && section === doc.section)
        .map(({ name, code }) => `${code} - ${name}`)

      return {
        title: "What was your organization’s primary Nomenclature of Economic Activities (NACE) division as of the end of the current reporting period?",
        description: "Organizations should select their primary NACE division based on the total revenue earned from the economic activity.",
        isRequired: true,
        type: 'checkbox',
        name: createName(doc.section, doc.name),
        visibleIf: `{PRIMARY_NACE_CODE} contains '${doc.section} - ${parent.name}'`,
        choices: secondLevelChoices
      }
    })

  const thirdLevelQuestions = naceDoc
    .filter(({ level }) => level === 2)
    .map<SurveyQuestion>((doc) => {

      const parent = naceDoc.find(({ level, section }) => level === 1 && section === doc.section)

      const thirdLevelChoices = naceDoc
        .filter(({ code, section }) => {
          return code.length === 4 && section === doc.section && code.substring(0, 2) === doc.code
        })
        .map(({ name, code }) => `${code} - ${name}`)

      return {
        title: "What was your organization’s primary Nomenclature of Economic Activities (NACE) class as of the end of the current reporting period?",
        description: "Organizations should select their primary NACE class based on the total revenue earned from the economic activity.",
        isRequired: true,
        type: 'checkbox',
        name: createName(doc.code, doc.name),
        visibleIf: `{${createName(parent.section,parent.name)}} contains '${doc.code} - ${doc.name}'`,
        choices: thirdLevelChoices
      }
    })

  const fourthLevelQuestions = naceDoc
    .filter(({ level }) => level === 3)
    .map<SurveyQuestion>((doc) => {

      const parent = naceDoc.find(({ level, section, code }) => level === 2 && section === doc.section && doc.code.substring(0, 2) === code)

      const fourthLevelChoices = naceDoc
        .filter(({ code, section }) => {
          return code.length === 5 && section === doc.section && code.substring(0, 4) === doc.code
        })
        .map(({ name, code }) => `${code} - ${name}`)

      return {
        title: "What was your organization’s primary Nomenclature of Economic Activities (NACE) activity as of the end of the current reporting period?",
        description: "Organizations should select their primary NACE activity based on the total revenue earned from the economic activity.",
        isRequired: true,
        type: 'radiogroup',
        name: createName(doc.code, doc.name),
        visibleIf: `{${createName(parent.code, parent.name)}} contains '${doc.code} - ${doc.name}'`,
        choices: fourthLevelChoices
      }
    })


  return [...firstLevelQuestion, ...secondLevelQuestions, ...thirdLevelQuestions, ...fourthLevelQuestions]
}

function convertTransformedNaceToJSON(arr: SurveyQuestion[]) {
  return JSON.stringify(arr, null, 4)
}

const jsonFilePath = path.join(process.cwd(), 'files',`result_${dayjs().valueOf()}.json`)
const makeFile = () => {
  if (fs.existsSync(jsonFilePath)){
    fs.unlink(`${jsonFilePath}`, (err)=> {
      if (err)
      console.error(err)
    })
  }

  fs.writeFileSync(jsonFilePath, convertTransformedNaceToJSON(parseNace(nace)))
}

makeFile()